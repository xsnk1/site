from flask import Flask, request, jsonify
from flask import render_template
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
import logging
from logging.handlers import RotatingFileHandler

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
logger.addHandler(handler)


app = Flask(__name__)
app.config['SECRET_KEY'] = 'verysecretkey'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    price = db.Column(db.Float, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

@app.route('/')
def home():
    return render_template('index.html')

@login_manager.user_loader
def load_user(user_id):
    try:
        return User.query.get(int(user_id))
    except Exception as e:
        app.logger.error(f"Failed to load user: {str(e)}")
        return None


@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data['email']).first()
    if user and user.check_password(data['password']):
        login_user(user)
        return jsonify({'status': 'success', 'message': 'Logged in successfully', 'isAuthenticated': True})
    return jsonify({'status': 'error', 'message': 'Invalid username or password', 'isAuthenticated': False}), 401


@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'status': 'error', 'message': 'Email already registered'}), 409
    user = User(username=data['username'], email=data['email'])
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'status': 'success', 'message': 'User registered successfully'})

@app.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'status': 'success', 'message': 'Logged out successfully'})


@app.route('/services', methods=['GET'])
def get_services():
    services = Service.query.all()
    services_data = [{
        'id': service.id,
        'name': service.name,
        'description': service.description,
        'phone': service.phone,
        'price': service.price,
        'user_id': service.user_id
    } for service in services]
    return jsonify({
        'services': services_data, 
        'current_user_id': current_user.id if current_user.is_authenticated else None
    })



@app.route('/add-service', methods=['POST'])
@login_required
def add_service():
    try:
        data = request.get_json()
        app.logger.info(f'Received data for new service: {data}')
        if not data:
            app.logger.warning('No data provided in request')
            return jsonify({'error': 'No data provided'}), 400
        service = Service(name=data['name'], description=data['description'], phone=data['phone'], price=data['price'], user_id=current_user.id)
        db.session.add(service)
        db.session.commit()
        app.logger.info(f'Service added successfully: {service}')
        return jsonify({'message': 'Service added successfully'}), 201
    except Exception as e:
        app.logger.error(f'Error adding service: {str(e)}')
        return jsonify({'error': 'Failed to add service'}), 500



@app.route('/delete-service/<int:service_id>', methods=['POST'])
@login_required
def delete_service(service_id):
    service = Service.query.filter_by(id=service_id, user_id=current_user.id).first()
    if service:
        db.session.delete(service)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Service deleted successfully'})
    else:
        return jsonify({'status': 'error', 'message': 'Service not found or permission denied'}), 404

@app.route('/is-authenticated', methods=['GET'])
def is_authenticated():
    if current_user.is_authenticated:
        return jsonify({'isAuthenticated': True})
    else:
        return jsonify({'isAuthenticated': False})


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
