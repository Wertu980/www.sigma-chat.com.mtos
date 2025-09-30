from flask import Flask, render_template

app = Flask(__name__, static_folder="static", template_folder="templates")

# Routes to load your HTML files directly
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/home")
def home():
    return render_template("home.html")

@app.route("/chat")
def chat():
    return render_template("chat.html")

@app.route("/addchat")
def add_chat():
    return render_template("addChat.html")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/signup")
def signup():
    return render_template("signup.html")


if __name__ == "__main__":
    app.run(debug=True)