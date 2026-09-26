"""Standalone helper to (re)create tables and load the demo dataset.

Usage (from the backend/ folder, with the virtual environment active):
    python seed.py            # seed only if the database is empty
    python seed.py --reset    # wipe everything and reload the demo data
"""
import sys

from app import models  # noqa: F401  (registers tables on the metadata)
from app.database import Base, SessionLocal, engine
from app.demo_data import seed_demo_data


def main() -> None:
    reset = "--reset" in sys.argv
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        result = seed_demo_data(db, reset=reset)
        print("Seed result:", result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
