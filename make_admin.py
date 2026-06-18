import sys
import os

# Add current directory to path so api module can be found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from api.db import SessionLocal
from api.user_models import User

def make_admin(username: str):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"Error: User '{username}' not found in the database. Please sign up in the UI first.")
            return
        
        if user.is_admin:
            print(f"User '{username}' is already an admin.")
            return

        user.is_admin = True
        db.commit()
        print(f"Success: User '{username}' has been successfully promoted to Admin!")
    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        make_admin(sys.argv[1])
    else:
        make_admin("ssoad")
