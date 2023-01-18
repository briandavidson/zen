import React from "react";
import { Route, Switch } from "react-router-dom";
import AuthContext from "./providers/auth";
import LoginPage from "./routes/login/login.jsx";
import TasksPage from "./routes/tasks/tasks.jsx";
import ProjectsPage from "./routes/projects/projects.jsx";
import SideNav from "./components/sidenav/sidenav.jsx";
import "./App.scss";

const App = () => {
  const authCtx = React.useContext(AuthContext);

  return (
    <>
      <SideNav></SideNav>
      <Switch>
        {/* public routes */}
        <Route path="/" exact>
          <LoginPage />
        </Route>

        {/* private routes */}
        {authCtx.user && (
          <Switch>
            <Route path="/tasks" exact>
              <TasksPage />
            </Route>
            <Route path="/projects" exact>
              <ProjectsPage />
            </Route>
          </Switch>
        )}
      </Switch>
    </>
  );
};

export default App;
