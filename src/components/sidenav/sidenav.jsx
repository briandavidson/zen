import React from "react";
import { useHistory } from "react-router-dom";
import AuthContext from "../../providers/auth";
import "./sidenav.scss";

const SideNav = () => {
  const authCtx = React.useContext(AuthContext);
  let history = useHistory();
  const navItems = [
    {
      name: "Projects",
      route: "/projects",
    },
    {
      name: "Tasks",
      route: "/tasks",
    },
  ];

  const [selected, setSelected] = React.useState({});
  const [expanded, setExpanded] = React.useState(false);

  const logout = () => {
    setSelected({});
    setExpanded(false);
    authCtx.logout();
    history.push("/");
  };

  const nav = (item) => {
    if (!authCtx.user?.uid) {
      history.push("/");
      setExpanded(false);
      setSelected({});
      return;
    }
    setSelected(item);
    setExpanded(false);
    history.push(item.route);
  };

  return (
    <>
      <div
        onClick={() => {
          setExpanded(!expanded);
        }}
        className={expanded ? "menu-button expanded" : "menu-button"}
      >
        <svg viewBox="0 0 100 80" width="20" height="20" fill="white">
          <rect width="100" height="10"></rect>
          <rect y="30" width="100" height="10"></rect>
          <rect y="60" width="100" height="10"></rect>
        </svg>
      </div>
      <div
        className={
          expanded ? "sidenav-background expanded" : "sidenav-background"
        }
        onClick={() => setExpanded(false)}
      ></div>
      <div className={expanded ? "sidenav expanded" : "sidenav"}>
        {navItems?.map((item, i) => (
          <div
            key={i}
            className={selected.route === item.route ? "item selected" : "item"}
          >
            <div
              onClick={() => {
                nav(item);
              }}
              className="item-container"
            >
              <div className="name">{item.name}</div>
            </div>
          </div>
        ))}
        <div className="item">
          <div
            className="item-container"
            onClick={() => {
              logout();
            }}
          >
            <div className="name">Sign Out</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SideNav;
