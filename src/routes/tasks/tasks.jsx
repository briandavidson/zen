import React, { useState, useContext } from "react";
import { Link, Redirect } from "react-router-dom";
import AuthContext from "../../providers/auth";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, get, child, ref } from "firebase/database";
import app from "../../firebase.js";

import KaizenLogo from "../../assets/images/favicon.jpg";
import "./tasks.scss";

const TasksPage = () => {
  const [enteredEmail, setEnteredEmail] = useState();
  const [enteredPassword, setEnteredPassword] = useState();

  const authCtx = useContext(AuthContext);

  if (authCtx.user?.type === "student") {
    return <Redirect to="student/dashboard" />;
  }

  if (authCtx.user?.type === "teacher") {
    return <Redirect to="teacher/dashboard" />;
  }

  // firebase vars
  const auth = getAuth(app);
  const db = ref(getDatabase(app));

  const loginHandler = () => {
    signInWithEmailAndPassword(auth, enteredEmail, enteredPassword).then((userCredential) => {
      getUserData(userCredential)
    }).catch((error) => {
      console.dir(error)
    })
  };

  const getUserData = (userCredential) => {
    get(child(db, `users/${userCredential.user.uid}`)).then((snapshot) => {
      if (snapshot.exists()) {
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
      <div className="auth-container">
        <img src={KaizenLogo} alt="" className="auth-logo" />
      </div>
    </div>
  );
};

export default TasksPage;
