"""Text / SMS Agent.

Primary detector: a trained TF-IDF + LogisticRegression classifier
(`models/scam_classifier.joblib`) fit on ~1M labelled phishing/SMS-spam
examples (CEAS_08, Spam-Ham, UCI SMS Spam). It returns a probability, which we
map to a 0-100 risk score.

Fallback: the hand-written `scan_text()` rulebook runs when the model file is
missing (e.g. a fresh checkout) so the app never breaks.

Hybrid: when both agree the score is confident; when they disagree the
rulebook reasons are still reported so every flag is explainable.

A fine-tuned transformer (e.g. DistilBERT) could drop in right here by
replacing `predict()` with a model call and mapping its label/probability to a
score; the rest of the pipeline is unchanged.
"""
import os
import pickle
import re

_MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models",
                          "scam_classifier.joblib")
_model = None


def _load_model():
    global _model
    if _model is None and os.path.exists(_MODEL_PATH):
        with open(_MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
    return _model


def predict(text: str) -> dict:
    """Classify text with the trained model.

    Returns {"scam": bool, "probability": float, "model": str}.
    Falls back to the rulebook when no model is available.
    """
    m = _load_model()
    if m is None:
        result = scan_text(text)
        return {
            "scam": result["score"] >= 35,
            "probability": result["score"] / 100.0,
            "model": "rulebook",
        }
    proba = m.predict_proba([text.lower()])[0][1]  # P(scam)
    return {"scam": proba >= 0.5, "probability": float(proba), "model": "tfidf-lr"}

# category -> (points, list of trigger phrases)
SCAM_CATEGORIES: dict[str, tuple[int, list[str]]] = {
    "urgency": (18, [
        "urgent", "immediately", "act now", "as soon as possible", "asap",
        "within 24 hours", "within 48 hours", "expire", "expires", "suspended",
        "suspend", "limited time", "final notice", "last warning", "right away",
        "before it's too late", "account will be closed", "action required",
    ]),
    "threat": (22, [
        "legal action", "lawsuit", "arrest", "arrested", "police", "warrant",
        "court", "fine", "penalty", "blocked", "terminated", "deactivat",
        "criminal", "prosecut", "seized", "suspend your account",
    ]),
    "reward": (20, [
        "you have won", "you won", "congratulations", "prize", "lottery",
        "gift card", "free gift", "claim your", "reward", "voucher",
        "cash prize", "you have been selected", "winner", "redeem",
    ]),
    "money": (24, [
        "wire transfer", "send money", "bitcoin", "crypto", "western union",
        "moneygram", "processing fee", "transfer fee", "deposit", "bank transfer",
        "zelle", "venmo", "cashapp", "pay a fee", "advance payment", "gift card",
    ]),
    "credentials": (28, [
        "otp", "one-time", "one time code", "one-time code", "password", "pin",
        "verify your account", "confirm your identity", "ssn", "social security",
        "verify your identity", "banking details", "card number", "cvv",
        "login details", "update your payment", "confirm your account",
    ]),
    "impersonation": (16, [
        "bank", "irs", "hmrc", "tax refund", "customs", "support team",
        "security team", "microsoft", "apple", "amazon", "paypal", "netflix",
        "government", "social security administration", "your bank",
    ]),
}


def scan_text(text: str) -> dict:
    """Score `text` against the scam rulebook.

    Returns {"score": int, "reasons": [str], "categories": [str]}.
    """
    lowered = (text or "").lower()
    score = 0
    reasons: list[str] = []
    categories: list[str] = []

    for category, (points, phrases) in SCAM_CATEGORIES.items():
        hits = [p for p in phrases if p in lowered]
        if hits:
            categories.append(category)
            # first hit full points, extra hits worth a little more (capped)
            score += points + min(len(hits) - 1, 2) * 3
            sample = ", ".join(f"“{h}”" for h in hits[:2])
            reasons.append(f"{_LABELS[category]} detected ({sample})")

    # ALL-CAPS shouting is a weak extra signal
    letters = re.sub(r"[^A-Za-z]", "", text or "")
    if len(letters) > 15 and sum(c.isupper() for c in letters) / len(letters) > 0.6:
        score += 6
        reasons.append("Excessive use of capital letters (pressure tactic)")

    return {"score": min(score, 100), "reasons": reasons, "categories": categories}


_LABELS = {
    "urgency": "Urgency / pressure tactics",
    "threat": "Threats or intimidation",
    "reward": "Fake reward or prize bait",
    "money": "Request to send money / fees",
    "credentials": "Request for passwords, OTPs or personal data",
    "impersonation": "Impersonation of a trusted organisation",
}


def analyze(content: str, indicators: list[dict], demo_mode: bool = False) -> dict:
    """Score content. The trained model is the primary detector; the rulebook
    supplies explainable reasons and acts as a fallback."""
    model_result = predict(content)
    rule_result = scan_text(content)

    prob = model_result["probability"]
    model_score = int(round(prob * 100))
    rule_score = rule_result["score"]

    # Blend: trust the model, but let strong rulebook signals pull the score up.
    score = max(model_score, rule_score if rule_score >= 55 else 0)
    score = min(score, 100)

    reasons = list(rule_result["reasons"])
    if model_result["model"] == "tfidf-lr":
        tag = (f"Trained classifier: {prob * 100:.0f}% scam probability "
               f"(model: TF-IDF + LogisticRegression)")
        reasons = [tag] + reasons

    # An unsolicited message that contains a link is more suspicious.
    has_url = any(i["type"] == "url" for i in indicators)
    if has_url and (rule_result["categories"] or model_result["scam"]):
        score = min(score + 10, 100)
        reasons.append("Message contains a link alongside pressure language")

    if not reasons:
        reasons.append("No known scam patterns detected in the message text")

    return {
        "agent": "Text/SMS Agent",
        "risk_score": score,
        "reasons": reasons,
        "categories": rule_result["categories"],
        "model": model_result["model"],
        "model_probability": prob,
    }
