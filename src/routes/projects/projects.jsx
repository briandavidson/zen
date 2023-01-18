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
  const [project, setProject] = React.useState({});
  const [shareMessage, setShareMessage] = React.useState('')
  const [email, setEmail] = React.useState('')
  const authCtx = useContext(AuthContext);

  // firebase vars
  const auth = getAuth(app);
  const db = ref(getDatabase(app));

  React.useEffect(() => {
    watchUserProjectList()
    return () => {
      for (var i = 0; i < projects?.length; i++) {
        const removeListenerRef = child(db, `projects/${projects[i].uid}`)
        off(removeListenerRef)
      }
      for (var i = 0; i < tasks?.length; i++) {
        const removeListenerRef = child(db, `tasks/${tasks[i].uid}`)
        off(removeListenerRef)
      }
      let userProjectListRef = child(db, `users/${authCtx.user.uid}/projects`)
      off(userProjectListRef)
    };
  }, [authCtx.user, db]);

  const watchUserProjectList = () => {
    let userProjectListRef = child(db, `users/${authCtx.user.uid}/projects`)
    onValue(userProjectListRef, (snapshot) => {
      let updatedProjectList = snapshot.val()
      refreshProjectWatchers(updatedProjectList)
    })
  }

  const refreshProjectWatchers = (updatedProjectList) => {
    // turn off existing watchers
    for (const project_uid in projects) {
      let projectRef = child(db, `projects/${project_uid}`)
      off(projectRef)
    }
    // set watchers on updated list of tasks
    for (const project_uid in updatedProjectList) {
      watchProject(project_uid)
    }
  }

  const watchProject = (project_uid) => {
    let projectRef = child(db, `projects/${project_uid}`)
    onValue(projectRef, (snapshot) => {
      let it = snapshot.val()
      if (it) {
        // the selected project changed, check for task list diffs
        if (it.uid === project.uid) {
          refreshTaskWatchers(it)
        }
        setProjects((prev) => {
          let index = prev
            .map((element) => {
              return element.uid;
            })
            .indexOf(it.uid);
          let next = prev;
          if (index === -1) {
            next.push(it)
          } else {
            next[index] = it;
          }
          return [...next];
        });
      } else {
        setProjects((prev) => {
          let index = prev
            .map((element) => {
              return element.uid;
            })
            .indexOf(snapshot.key);
          let next = prev;
          next.splice(index, 1);
          return [...next];
        });
      }
    })
  }

  const getProject = (project_uid) => {
    return get(child(db, `projects/${project_uid}`)).then(async (snapshot) => {
      let project_data = snapshot.val();
      return project_data;
    });
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
          name: '',
          tasks: {
            ...prev.tasks,
            [task_uid]: true
          }
        }
      })
      setView((prev) => {
        return 'edit-project'
      })
      watchTask(task_uid)
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
    refreshTaskWatchers(item)
  }

  const refreshTaskWatchers = (item) => {
    // turn off existing watchers
    let oldTasks = tasks
    for (const task_uid in oldTasks) {
      let taskRef = child(db, `tasks/${task_uid}`)
      off(taskRef)
    }
    // set watchers on updated list of tasks
    for (const task_uid in item?.tasks) {
      watchTask(task_uid)
    }
  }

  const watchTask = (task_uid) => {
    let taskRef = child(db, `tasks/${task_uid}`)
    onValue(taskRef, (snapshot) => {
      let it = snapshot.val()
      if (it) {
        setTasks((prev) => {
          let index = prev
            .map((element) => {
              return element.uid;
            })
            .indexOf(it.uid);
          let next = prev;
          if (index === -1) {
            next.push(it)
          } else {
            next[index] = it;
          }
          return [...next];
        });
      } else {
        setTasks((prev) => {
          let index = prev
            .map((element) => {
              return element.uid;
            })
            .indexOf(snapshot.key);
          let next = prev;
          next.splice(index, 1);
          return [...next];
        });
      }
    })
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
      createProject();
    }
  }

  const clickCheckCreateProject = () => {
    createProject()
  }

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
      setView((prev) => {
        return 'list-projects'
      })
      setEmail((prev) => {
        return ''
      })
      setShareMessage((prev) => {
        return ''
      })
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
      setProject((prev) => {
        let next = {
          owners: {},
          name: 'after deleting a project',
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
      addTaskToProject();
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
      // add new user to project in state
      setProject((prev) => {
        let next = {
          ...prev,
          owners: {
            ...prev.owners,
            [user.uid]: true
          }
        }
        return next
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
