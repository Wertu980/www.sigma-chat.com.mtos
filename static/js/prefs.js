export const Prefs = {
  saveToken(v){ localStorage.setItem("token", v); },
  getToken(){ return localStorage.getItem("token"); },

  saveUserId(v){ localStorage.setItem("user_id", v); },
  getUserId(){ return localStorage.getItem("user_id"); },

  saveUserName(v){ localStorage.setItem("name", v); },
  getUserName(){ return localStorage.getItem("name"); },

  savePhone(v){ localStorage.setItem("phone", v); },
  getPhone(){ return localStorage.getItem("phone"); },

  clear(){ localStorage.clear(); }
};