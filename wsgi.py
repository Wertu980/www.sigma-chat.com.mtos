# wsgi.py
from app import app  # reuse your Flask instance from app.py

# If you prefer, you could create the app here instead:
# from flask import Flask
# app = Flask(__name__, template_folder="templates", static_folder="static")