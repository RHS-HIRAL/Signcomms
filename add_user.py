from app import db, User, app

# Change these values as needed
username = "hiral"
password = "hiral"  # In production, use hashed passwords!

with app.app_context():
    # Check if user exists
    if not User.query.filter_by(username=username).first():
        user = User(username=username, password=password)
        db.session.add(user)
        db.session.commit()
        print("User created!")
    else:
        print("User already exists.")