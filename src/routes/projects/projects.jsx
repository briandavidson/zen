import React, { useState, useContext } from "react";
import { Link, Redirect, useHistory } from "react-router-dom";
import AuthContext from "../../providers/auth";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getDatabase,
  get,
  child,
  ref,
  push,
  update,
  onValue,
  off,
} from "firebase/database";
import app from "../../firebase.js";

import KaizenLogo from "../../assets/images/favicon.jpg";
import "./projects.scss";

const ProjectsPage = () => {
  let history = useHistory();
  const [view, setView] = React.useState("list-projects");
  const [modal, setModal] = React.useState({
    visible: false,
    action: "",
    data: {},
  });
  const [tasks, setTasks] = React.useState([]);
  const [task, setTask] = React.useState({name: ''});
  const [projects, setProjects] = React.useState([]);
  const [project, setProject] = React.useState({name: ''});
  const [showSharing, setShowSharing] = React.useState(false)
  const [shareMessage, setShareMessage] = React.useState('')
  const [email, setEmail] = React.useState('')
  const authCtx = useContext(AuthContext);

  // firebase vars
  const auth = getAuth(app);
  const db = ref(getDatabase(app));

  React.useEffect(() => {
    getProjects();
    // watchProjects()
  }, []);

  const getProject = (project_uid) => {
    return get(child(db, `projects/${project_uid}`)).then(async (snapshot) => {
      let project_data = snapshot.val();
      return project_data;
    });
  };

  const getProjects = async () => {
    setProjects((prev) => {
      return [];
    });
    for (var project_uid in authCtx.user.projects) {
      let project_data = await getProject(project_uid);
      if (project_data) {
        project_data.uid = project_uid;
        setProjects((prev) => {
          let next = [...prev, project_data];
          return next;
        });
      }
    }
  };

  const clickCloseCreateProject = () => {
    setView((prev) => {
      return 'list-projects'
    })
    setProject((prev) => {
      return {
        owners: {},
        name: '',
        uid: '',
        tasks: {}
      }
    })
  }

  const clickClose = () => {
    console.log('click close')
    // close the show sharing screen if it's active
    if (showSharing) {
      setShowSharing((prev) => {
        return false
      })
      return
    }

    // close the create / edit screen if it's active
    setView((prev) => {
      return 'list'
    })
    setShowSharing((prev) => {
      return false
    })
    setEmail((prev) => {
      return ''
    })
    setShareMessage((prev) => {
      return ''
    })
    setProject((prev) => {
      return {
        owners: {},
        name: '',
        uid: '',
        tasks: {}
      }
    })
    setTasks((prev) => {
      return []
    })
  }

  const showCreateProject = () => {
    setView('create-project')
    setTimeout(() => {
      let inputs = document.getElementsByClassName("project-input");
      let input = inputs[0];
      input.focus();
    }, 100);
  }

  const showAddTaskToProjectView = () => {
    setView('add-task')
    setTimeout(() => {
      let inputs = document.getElementsByClassName("task-name");
      let input = inputs[0];
      input.focus();
    }, 100);
  }

  const clickCloseTask = () => {
    setTask((prev) => {
      let next = {
        project: "",
        owners: {},
        name: "",
        uid: "",
      };
      return next;
    });
    setView('edit-project')
  }

  const addTaskToProject = () => {
    // require a name
    if (task?.name.length === 0) {
      return
    }

    // update or create?
    let task_uid = task.uid ? task.uid : push(child(db, 'tasks')).key;
    let newTask = {
      name: task.name,
      uid: task_uid,
      project: project.uid,
      owners: project.owners
    }

    // update firebase
    const updates = {};
    updates['/tasks/' + task_uid] = newTask;
    updates[`/users/${authCtx.user.uid}/tasks/${task_uid}`] = true

    // add task to project
    updates[`/projects/${project.uid}/tasks/${task_uid}`] = true
    for (const owner_uid in project.owners) {
      updates[`/users/${owner_uid}/tasks/${task_uid}`] = true
    }

    update(db, updates).then(() => {
      authCtx.user.tasks[task_uid] = true
      setTask((prev) => {
        let next = {
          project: '',
          owners: {},
          name: '',
          uid: ''
        }
        return next
      })
      setProject((prev) => {
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [task_uid]: true
          }
        }
      })
      setView((prev) => {
        return 'edit-project'
      })
      getTasks(project.uid)
    }).catch((error) => {
      setTask((prev) => {
        let next = {
          project: '',
          owners: {},
          name: '',
          uid: ''
        }
        return next
      })
      console.log(error)
    });
  }

  const selectProject = (item) => {
    setProject((prev) => {
      return item
    })
    setView((prev) => {
      return 'edit-project'
    })
    getTasks(item.uid)
  }

  const showConfirmDeleteProjectModal = (item) => {
    setModal((prev) => {
      return {
        visible: true,
        action: "delete-project",
        data: item,
      };
    });
  }

  const emailChange = (event) => {
    let text = event.target.value
    setEmail((prev) => {
      return text
    })
  }

  const emailKeyDown = (event) => {}

  const projectNameChange = (event) => {
    let name = event.target.value;
    setProject((prev) => {
      return {...prev, name: name};
    });
  }

  const projectNameKeypress = (event) => {
    if (event.code === "Enter") {
      clickCheck();
    }
  }

  const clickPlus = () => {
    if (view === "create") {
      setTask((prev) => {
        let next = {
          project: "",
          owners: {},
          name: "",
          uid: "",
        };
        return next;
      });
      setView("list");
      getTasks(project.uid);
    } else if (view === "list-projects") {
      setView("create");
      setProject((prev) => {
        let next = {
          owners: {},
          name: "",
          value: "",
          uid: "",
        };
        return next;
      });
      setTimeout(() => {
        let inputs = document.getElementsByClassName("task-name");
        let input = inputs[0];
        input.focus();
      }, 100);
    }
  };

  const clickCheckCreateProject = () => {
    createProject()
  }

  const clickCheck = () => {
    if (view === 'create') {
      if (showSharing) {
        this.shareProject()
      } else {
        this.createProject()
      }
    }
  };

  const createProject = () => {
    if (project?.name.length === 0) {
      return
    }
    const project_uid = push(child(db, 'projects')).key;
    let newProject = {
      name: project.name,
      uid: project_uid,
      owners: {
        [authCtx.user.uid]: true
      }
    }
    const updates = {};
    updates['/projects/' + project_uid] = newProject;
    updates[`/users/${authCtx.user.uid}/projects/${project_uid}`] = true

    update(db, updates).then(() => {
      setProject((prev) => {
        return {
          owners: {},
          name: '',
          uid: ''
        }
      })
      setView((prev) => {
        return 'list-projects'
      })
      setShowSharing((prev) => {
        return false
      })
      setEmail((prev) => {
        return ''
      })
      setShareMessage((prev) => {
        return ''
      })
      // make sure user.projects is defined
      if (!authCtx.user.projects) {
        authCtx.user = {
          ...authCtx.user,
          projects: {}
        }
      }
      authCtx.user.projects[project_uid] = true
      getProjects()
    }).catch((error) => {
      console.log(error)
    });
  }

  const clickCheckbox = (item) => {
    item.checked = !item.checked;
    let updates = {};
    updates[`tasks/${item.uid}/checked`] = item.checked;
    update(db, updates).then(() => {
      getTasks(project.uid)
    });
  };

  const getTask = (task_uid) => {
    return get(child(db, `tasks/${task_uid}`)).then(async (snapshot) => {
      let task_data = snapshot.val();
      return task_data;
    });
  };

  const getTasks = async (project_uid) => {
    let proj = await getProject(project_uid)
    setTasks((prev) => {
      return [];
    });
    for (var task_uid in proj.tasks) {
      let task_data = await getTask(task_uid);
      if (task_data) {
        task_data.uid = task_uid;
        setTasks((prev) => {
          let next = [...prev, task_data];
          return next;
        });
      }
    }
  };

  const editTask = (item) => {
    setTask((prev) => {
      return item;
    });
    setView("edit-task");
    setTimeout(() => {
      let inputs = document.getElementsByClassName("task-name");
      let input = inputs[0];
      input.focus();
    }, 100);
  };

  const deleteProject = async (item) => {
    let updates = {}
    updates[`projects/${item.uid}`] = {}
    for (const owner_uid in item.owners) {
      updates[`users/${owner_uid}/projects/${item.uid}`] = {}
      for (const task_id in item?.tasks) {
        updates[`users/${owner_uid}/tasks/${task_id}`] = {}
        updates[`tasks/${task_id}`] = {}
        let task_data = await getTask(task_id)
        updates[`archived_tasks/${task_id}`] = task_data
      }
    }
    update(db, updates).then(() => {
      delete authCtx.user.projects[item.uid]
      setProject((prev) => {
        let next = {
          owners: {},
          name: '',
          uid: '',
          tasks: {}
        }
        return next
      })
      setView((prev) => {
        return 'list-projects'
      })
      setModal((prev) => {
        let next = {
          visible: false,
          action: '',
          data: {}
        }
        return next
      })
      getProjects()
    })
  }

  const deleteTask = (item) => {
    let updates = {};
    updates[`/tasks/${item.uid}`] = {};
    updates[`/archived_tasks/${item.uid}`] = item;
    for (const user_uid in item.owners) {
      updates[`/users/${user_uid}/tasks/${item.uid}`] = {};
    }
    if (item.project !== "") {
      updates[`/projects/${item.project}/tasks/${item.uid}`] = {};
    }
    update(db, updates).then(() => {
      let next = authCtx.user.tasks;
      delete next[item.uid];
      authCtx.user.tasks = next;
      let taskRef = child(db, `/tasks/${item.uid}`);
      off(taskRef);
      getTasks(project.uid)
      setModal((prev) => {
        return {
          visible: false,
          action: "",
          data: {},
        };
      });
    });
  };

  const showConfirmDeleteTaskModal = (item) => {
    setModal((prev) => {
      return {
        visible: true,
        action: "delete-task",
        data: item,
      };
    });
  };

  const taskNameChange = (event) => {
    let name = event.target.value;
    setTask((prev) => {
      return { ...prev, name: name };
    });
  };

  const taskNameKeypress = (event) => {
    if (event.code === "Enter") {
      clickCheck();
    }
  };

  const clickShare = () => {
    setView((prev) => {
      return 'share-project'
    })
  }

  const clickCloseShareProject = () => {
    setEmail((prev) => {
      return ''
    })
    setShareMessage((prev) => {
      return ''
    })
    setView((prev) => {
      return 'edit-project'
    })
  }

  const clickCheckShareProject = () => {
    if (email.length === 0) {
      return
    }
    get(child(db, `users`)).then(async (snapshot) => {
      let userObj = snapshot.val()
      let found = false
      let found_user = {}
      for (const user_uid in userObj) {
        let user = userObj[user_uid]
        if (user.email === email) {
          found = true
          found_user = user
        }
      }
      if (!found) {
        setShareMessage((prev) => {
          return `no user with that email was found`
        })
      } else {
        addUserToProject(found_user)
      }
    })
  }

  const addUserToProject = (user) => {
    let updates = {}
    updates[`users/${user.uid}/projects/${project.uid}`] = true
    updates[`projects/${project.uid}/owners/${user.uid}`] = true
    for (const task_uid in project?.tasks) {
      updates[`users/${user.uid}/tasks/${task_uid}`] = true
      updates[`tasks/${task_uid}/owners/${user.uid}`] = true
    }
    update(db, updates).then(() => {
      setShareMessage((prev) => {
        return `${project.name} is now shared with ${email}`
      })
    }).catch((error) => {
      console.log(error)
    });
  }

  const confirm = () => {
    if (modal.action === "delete-task") {
      let item = modal.data;
      deleteTask(item);
    }
    if (modal.action === "delete-project") {
      let item = modal.data;
      deleteProject(item);
    }
  };

  const deny = () => {
    setModal((prev) => {
      return {
        visible: false,
        action: "",
        data: {},
      };
    });
  };

  const getUserData = (userCredential) => {
    get(child(db, `users/${userCredential.user.uid}`))
      .then((snapshot) => {
        if (snapshot.exists()) {
          const user = snapshot.val();
          user.uid = userCredential.user.uid;
          authCtx.login(user);
        } else {
          console.log("No user data available");
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <>
      <div className="mobile-buttons">
        {((view === "list-projects") || (view === "create-project") || (view === 'edit-project')) && (
          <svg
            className={`cross ${view}`}
            onClick={() =>
              view === "list-projects" ? showCreateProject() : clickCloseCreateProject()
            }
            viewBox="0 0 100 100"
            width="40"
            height="40"
            stroke="white"
          >
            <line x1="25" y1="50" x2="75" y2="50" strokeWidth="10"></line>
            <line x1="50" y1="25" x2="50" y2="75" strokeWidth="10"></line>
          </svg>
        )}
        {((view === 'edit-project') || (view === 'add-task') || (view === 'edit-task')) && (
          <svg
            className={`add-task-to-project ${view}`}
            onClick={() =>
              view === "edit-project" ? showAddTaskToProjectView() : clickCloseTask()
            }
            viewBox="0 0 100 100"
            width="40"
            height="40"
            stroke="white"
          >
            <line x1="25" y1="50" x2="75" y2="50" strokeWidth="10"></line>
            <line x1="50" y1="25" x2="50" y2="75" strokeWidth="10"></line>
          </svg>
        )}
        {((view === "create-project")) && (
          <svg
            className={"check " + `${view}`}
            onClick={() => {
              clickCheckCreateProject();
            }}
            viewBox="0 0 100 100"
            width="40"
            height="40"
            stroke="white"
          >
            <line x1="25" y1="50" x2="55" y2="75" strokeWidth="10"></line>
            <line x1="50" y1="75" x2="85" y2="25" strokeWidth="10"></line>
          </svg>
        )}
        {view === "edit-project" && (
          <img src={require("../../assets/icons/user.png")} className="share-icon" onClick={() => clickShare()}/>
        )}
        {((view === "add-task") || (view === 'edit-task')) && (
          <svg
            className="check task"
            onClick={() => {
              addTaskToProject();
            }}
            viewBox="0 0 100 100"
            width="40"
            height="40"
            stroke="white"
          >
            <line x1="25" y1="50" x2="55" y2="75" strokeWidth="10"></line>
            <line x1="50" y1="75" x2="85" y2="25" strokeWidth="10"></line>
          </svg>
        )}
      </div>

      {modal.visible && (
        <div className="confirmation-modal">
          <svg
            className="deny"
            onClick={() => {
              deny();
            }}
            viewBox="0 0 100 100"
            width="40"
            height="40"
            stroke="white"
          >
            <line x1="25" y1="50" x2="75" y2="50" strokeWidth="10"></line>
            <line x1="50" y1="25" x2="50" y2="75" strokeWidth="10"></line>
          </svg>
          <svg
            className="confirm"
            onClick={() => {
              confirm();
            }}
            viewBox="0 0 100 100"
            width="40"
            height="40"
            stroke="white"
          >
            <line x1="25" y1="50" x2="55" y2="75" strokeWidth="10"></line>
            <line x1="50" y1="75" x2="85" y2="25" strokeWidth="10"></line>
          </svg>
        </div>
      )}

          {view === "list-projects" && (
            <div className="content">
              {projects.length === 0 && (
                <div className="no-items">You have no projects.</div>
              )}
              {projects.length > 0 && (
                <div className="items-list">
                  {projects?.map((item, i) => (
                    <div key={i} className="item">
                      <div
                        onClick={() => {
                          selectProject(item);
                        }}
                        className="text-container"
                      >
                        <span className="item-title">{item.name}</span>
                      </div>
                      <svg
                        className="delete-task-button"
                        onClick={() => {
                          showConfirmDeleteProjectModal(item);
                        }}
                        viewBox="0 0 100 100"
                        width="40"
                        height="40"
                        stroke="white"
                      >
                        <line
                          x1="30"
                          y1="50"
                          x2="70"
                          y2="50"
                          strokeWidth="5"
                        ></line>
                        <line
                          x1="50"
                          y1="30"
                          x2="50"
                          y2="70"
                          strokeWidth="5"
                        ></line>
                      </svg>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

      {((view === "edit-project") || (view === 'add-task')) && (
        <div className="content">
          {tasks.length === 0 && (
            <div className="no-items">This project has no tasks.</div>
          )}
          {tasks.length > 0 && (
            <div className="items-list tasks-list">
              {tasks?.map((item, i) => (
                <div key={i} className="item task">
                  <div className="checkbox-container">
                    <input
                      type="checkbox"
                      value={item.checked}
                      className={
                        item.checked
                          ? "checkbox-input checked"
                          : "checkbox-input"
                      }
                    />
                    <span
                      onClick={() => {
                        clickCheckbox(item);
                      }}
                      className="custom-checkbox"
                    ></span>
                  </div>
                  <div
                    className="text-container"
                    onClick={() => {
                      editTask(item);
                    }}
                  >
                    <span
                      className={
                        item.checked ? "item-title checked" : "item-title"
                      }
                    >
                      {item.name}
                    </span>
                  </div>
                  <svg
                    className="delete-task-button"
                    onClick={() => {
                      showConfirmDeleteTaskModal(item);
                    }}
                    viewBox="0 0 100 100"
                    width="40"
                    height="40"
                    stroke="white"
                  >
                    <line
                      x1="30"
                      y1="50"
                      x2="70"
                      y2="50"
                      strokeWidth="5"
                    ></line>
                    <line
                      x1="50"
                      y1="30"
                      x2="50"
                      y2="70"
                      strokeWidth="5"
                    ></line>
                  </svg>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {view === 'share-project' && (
        <div className="content">
        <div className="mobile-buttons">
        <svg
          className={`cross ${view}`}
          onClick={() =>
            clickCloseShareProject()
          }
          viewBox="0 0 100 100"
          width="40"
          height="40"
          stroke="white"
        >
          <line x1="25" y1="50" x2="75" y2="50" strokeWidth="10"></line>
          <line x1="50" y1="25" x2="50" y2="75" strokeWidth="10"></line>
        </svg>
        <svg
          className={"check " + `${view}`}
          onClick={() => {
            clickCheckShareProject();
          }}
          viewBox="0 0 100 100"
          width="40"
          height="40"
          stroke="white"
        >
          <line x1="25" y1="50" x2="55" y2="75" strokeWidth="10"></line>
          <line x1="50" y1="75" x2="85" y2="25" strokeWidth="10"></line>
        </svg>
        </div>
        <div className="share-container">
          <input
            value={email}
            onChange={(event) => emailChange(event)}
            onKeyDown={(event) => emailKeyDown(event)}
            placeholder="Email"
            className="share-input"
            type="email"
          />
          <span className="share-message">{ shareMessage }</span>
        </div>
        </div>
      )}

      {((view === "add-task") || (view === 'edit-task')) && (
        <div className="content">
          <div className="create-form">
            <input
              value={task.name}
              onChange={(event) => taskNameChange(event)}
              onKeyDown={(event) => taskNameKeypress(event)}
              className="task-name"
              placeholder="Task"
              type="text"
            />
          </div>
        </div>
      )}

      {view === "create-project" && (
        <div className="content">
          <div className="create-form">
            <input
              value={project.name}
              onKeyDown={(event) => projectNameKeypress(event)}
              onChange={(event) => projectNameChange(event)}
              className="project-input"
              placeholder="Project"
              type="text"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectsPage;