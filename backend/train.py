"""Train the ScamShield AI scam classifier.

Reads your labelled datasets, trains a TF-IDF + LinearSVC classifier, and
serialises it to models/scam_classifier.joblib. The Text/SMS Agent then loads
this model instead of the hand-written rulebook.

Datasets expected under C:/Users/Aadarsh/Downloads/:
  email2/CEAS_08.csv            sender,receiver,date,subject,body,label,urls
  email4/spam_ham_dataset.csv   label,label_num,text
  scam3/Dataset_5971.csv       LABEL,TEXT,URL,EMAIL,PHONE
  scam3/spam1.csv              v1,v2 (ham/spam, message text)
  scam3/spam2.csv              index,ham/spam,message
  new_data_urls.csv            url,status
"""
import csv
import glob
import os
import pickle
import re
import sys

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

DOWNLOADS = os.environ.get("SCAM_DATASETS_DIR", r"C:/Users/Aadarsh/Downloads")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.makedirs(OUT, exist_ok=True)


def _read_csv(path, encoding="utf-8"):
    csv.field_size_limit(2_000_000)  # some CEAS rows are huge
    with open(path, encoding=encoding, errors="replace") as f:
        return list(csv.reader(f))


def _clean(text):
    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9\s@\.\:/\+\-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load():
    """Return (texts, labels) where label 1 = scam/phishing/spam."""
    X, y = [], []

    def add(rows, text_idx, label_idx, pos_labels, neg_labels, max_rows=None):
        n = 0
        for r in rows[1:]:
            if len(r) <= max(text_idx, label_idx):
                continue
            lab = r[label_idx].strip().lower()
            if lab in pos_labels:
                v = 1
            elif lab in neg_labels:
                v = 0
            else:
                continue
            t = _clean(r[text_idx])
            if len(t) < 8:
                continue
            X.append(t)
            y.append(v)
            n += 1
            if max_rows and n >= max_rows:
                break
        return n

    # 1. CEAS_08 phishing corpus (1.3M rows) — stream, cap at 200k
    p = os.path.join(DOWNLOADS, "email2", "CEAS_08.csv")
    if os.path.exists(p):
        csv.field_size_limit(2_000_000)
        n = 0
        with open(p, encoding="utf-8", errors="replace") as f:
            rd = csv.reader(f)
            next(rd, None)  # header
            for r in rd:
                if len(r) < 7:
                    continue
                lab = r[5].strip().lower()        # CEAS column 5 = label (1=ham, 0=spam)
                if lab not in ("spam", "ham", "1", "0"):
                    continue
                t = _clean(r[3] + " " + r[4])  # subject + body
                if len(t) < 8:
                    continue
                # CEAS uses 1=ham, 0=spam (opposite of the other corpora)
                X.append(t)
                y.append(1 if lab in ("spam", "0") else 0)
                n += 1
                if n >= 200000:
                    break
        print(f"CEAS_08: +{n}")
    else:
        print("CEAS_08: MISSING")

    # 2. spam_ham dataset
    p = os.path.join(DOWNLOADS, "email4", "spam_ham_dataset.csv")
    if os.path.exists(p):
        n = add(_read_csv(p), 2, 0, {"spam"}, {"ham"}, max_rows=60000)
        print(f"spam_ham: +{n}")
    else:
        print("spam_ham: MISSING")

    # 3. Dataset_5971 (structured indicators)
    p = os.path.join(DOWNLOADS, "scam3", "Dataset_5971.csv")
    if os.path.exists(p):
        n = add(_read_csv(p), 1, 0, {"spam"}, {"ham"}, max_rows=5000)
        print(f"Dataset_5971: +{n}")
    else:
        print("Dataset_5971: MISSING")

    # 4. spam1.csv (v1,v2)
    p = os.path.join(DOWNLOADS, "scam3", "spam1.csv")
    if os.path.exists(p):
        n = add(_read_csv(p), 1, 0, {"spam"}, {"ham"}, max_rows=5000)
        print(f"spam1: +{n}")

    # 5. spam2.csv (index,ham/spam,message)
    p = os.path.join(DOWNLOADS, "scam3", "spam2.csv")
    if os.path.exists(p):
        n = add(_read_csv(p), 2, 1, {"spam"}, {"ham"}, max_rows=2000)
        print(f"spam2: +{n}")

    return X, y


def main():
    X, y = load()
    if not X:
        print("No training data found. Put datasets under", DOWNLOADS)
        sys.exit(1)

    n_scam = sum(y)
    print(f"\nTotal samples: {len(X)}  scam={n_scam}  ham={len(X) - n_scam}")

    # Stratified 80/20 split (positional slicing skewed the classes badly)
    Xtr, Xte, ytr, yte = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=40000, ngram_range=(1, 2), sublinear_tf=True,
            min_df=2, max_df=0.95,
        )),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced", C=1.0)),
    ])
    pipe.fit(Xtr, ytr)

    pred = pipe.predict(Xte)
    acc = accuracy_score(yte, pred)
    print(f"\nAccuracy on holdout: {acc:.4f}")
    print(classification_report(yte, pred, target_names=["ham", "scam"], digits=3))

    path = os.path.join(OUT, "scam_classifier.joblib")
    with open(path, "wb") as f:
        pickle.dump(pipe, f)
    print(f"\nSaved model -> {path}  ({os.path.getsize(path)/1e6:.1f} MB)")


if __name__ == "__main__":
    main()