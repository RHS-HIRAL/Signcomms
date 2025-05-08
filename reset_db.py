import os
from app import db, app, User

def reset_database():
    db_path = os.path.join(os.getcwd(), 'users.db')
    if os.path.exists(db_path):
        os.remove(db_path)
        print('Old users.db deleted.')
    else:
        print('No existing users.db found.')
    with app.app_context():
        db.create_all()
        print('New users.db created with updated schema.')

if __name__ == '__main__':
    reset_database() 