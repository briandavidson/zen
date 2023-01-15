import React, { useState, useContext } from "react";
import { Link, Redirect } from "react-router-dom";
import AuthContext from "../../providers/auth";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { getDatabase, get, child, ref, set } from "firebase/database";
import app from "../../firebase.js";

import KaizenLogo from "../../assets/images/favicon.jpg";
import "./login.scss";

const LoginPage = () => {
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [confirmPassword, setConfirmPassword] = useState();
  const [view, setView] = useState("login");

  const authCtx = useContext(AuthContext);

  if (authCtx.user?.uid) {
    return <Redirect to="tasks" />;
  }

  // firebase vars
  const auth = getAuth(app);
  const db = getDatabase(app);

  const login = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        getUserData(userCredential);
      })
      .catch((error) => {
        console.dir(error);
      });
  };

  const signup = () => {
    if (password === confirmPassword && password !== "") {
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const user = userCredential.user;
          addUserToDatabase(user);
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          console.log("errorCode, errorMessage:", errorCode, errorMessage);
        });
    }
  };

  const addUserToDatabase = (user) => {
    let newUser = {
      email: email,
      uid: user.uid,
    };
    set(ref(db, "users/" + user.uid), newUser).then(() => {
      authCtx.login(newUser);
    });
  };

  const getUserData = (userCredential) => {
    get(ref(db, `users/${userCredential.user.uid}`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const user = snapshot.val();
          user.uid = userCredential.user.uid;
          authCtx.login(user);
          return <Redirect to="tasks" />;
        } else {
          console.log("No user data available");
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <div className="content">
      {view === "login" && (
        <div className="auth-form">
          <input
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email"
            type="text"
            className="email-input"
          />
          <input
            onChange={(event) => setPassword(event.target.value)}
            placeholder="password"
            className="password-input"
            type="password"
          />
          <div className="login-signup">
            <div
              onClick={() => {
                login();
              }}
              className="outer-button login-signup-button"
            >
              <div className="inner-button">Log In</div>
            </div>
            <div
              onClick={() => {
                setView("signup");
              }}
              className="outer-button login-signup-button"
            >
              <div className="inner-button">Register</div>
            </div>
          </div>
        </div>
      )}
      {view === "signup" && (
        <div className="auth-form">
          <input
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email"
            type="text"
            className="email-input"
          />
          <input
            onChange={(event) => setPassword(event.target.value)}
            placeholder="password"
            className="password-input"
            type="password"
          />
          <input
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="confirm password"
            className="confirm-password-input"
            type="password"
          />
          <div className="login-signup">
            <div
              onClick={() => {
                signup();
              }}
              className="outer-button login-signup-button"
            >
              <div className="inner-button">Sign Up</div>
            </div>
            <div
              onClick={() => {
                setView("login");
              }}
              className="outer-button login-signup-button"
            >
              <div className="inner-button">Go To Login</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
