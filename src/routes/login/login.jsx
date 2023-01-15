import React, { useState, useContext } from "react";
import { Link, Redirect } from "react-router-dom";
import AuthContext from "../../providers/auth";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, get, child, ref, set } from "firebase/database";
import app from "../../firebase.js";

import KaizenLogo from "../../assets/images/favicon.jpg";
import "./login.scss";

const LoginPage = () => {
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [confirmPassword, setConfirmPassword] = useState();
  const [view, setView] = useState('login')

  const authCtx = useContext(AuthContext);

  // if (authCtx.user?.type === "student") {
  //   return <Redirect to="student/dashboard" />;
  // }

  // firebase vars
  const auth = getAuth(app);
  const db = getDatabase(app);

  const loginHandler = () => {
    signInWithEmailAndPassword(auth, email, password).then((userCredential) => {
      console.dir(userCredential)
      getUserData(userCredential)
    }).catch((error) => {
      console.dir(error)
    })
  };

  const signupHandler = () => {
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
    }
    set(ref(db, "users/" + user.uid), newUser).then(()=>{
      authCtx.login(newUser)
    })
  };

  const getUserData = (userCredential) => {
    console.log('honk')
    get(ref(db, `users/${userCredential.user.uid}`)).then((snapshot) => {
      console.log('hello')
      if (snapshot.exists()) {
        console.dir(snapshot.val())
        const user = snapshot.val()
        user.uid = userCredential.user.uid
        authCtx.login(user)
      } else {
        console.log("No user data available");
      }
    }).catch((error) => {
      console.error(error);
    });
  };

  return (
    <div className="auth-page">
      {view === 'login' &&
      <div className="auth-container">
        <img src={KaizenLogo} alt="" className="auth-logo" />
        <hr />
        <p>Enter Email</p>
        <input
          className='auth-input'
          type="email"
          placeholder="email"
          onChange={(event) => setEmail(event.target.value)}
        />
        <p>Enter Password</p>
        <input
          className='auth-input'
          type="password"
          placeholder="password"
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="auth-button-container">
          <button
            className="auth-btn"
            onClick={() => {
              loginHandler();
            }}
            color="info"
          >
            Login
          </button>
          <button onClick={() => {setView('signup')}} className="auth-btn" color="info">
            Go to Signup
          </button>
        </div>
      </div>
      }

      {view === 'signup' &&
      <div className="auth-container">
        <img src={KaizenLogo} alt="" className="auth-logo" />
        <hr />
        <p>Enter Email</p>
        <input
          className='auth-input'
          type="email"
          placeholder="email"
          onChange={(event) => setEmail(event.target.value)}
        />
        <p>Enter Password</p>
        <input
          className='auth-input'
          type="password"
          placeholder="password"
          onChange={(event) => setPassword(event.target.value)}
        />
        <p>Confirm Password</p>
        <input
          className='auth-input'
          type="password"
          placeholder="password"
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <div className="auth-button-container">
          <button
            className="auth-btn"
            onClick={() => {
              signupHandler();
            }}
            color="info"
          >
            Signup
          </button>
          <button onClick={() => {setView('login')}} className="auth-btn" color="info">
            Go to Login
          </button>
        </div>
      </div>
      }
    </div>
  );
};

export default LoginPage;
