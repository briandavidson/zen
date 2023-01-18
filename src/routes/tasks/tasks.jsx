import React from "react";
import AuthContext from "../../providers/auth";
import {
  getDatabase,
  child,
  ref,
  push,
  update,
  onValue,
  off
} from "firebase/database";
import app from "../../firebase.js";

import "./tasks.scss";

const TasksPage = () => {
  const [view, setView] = React.useState("list");
  const [modal, setModal] = React.useState({
    visible: false,
    action: "",
    data: {},
  });
  const [tasks, setTasks] = React.useState([]);
  const [task, setTask] = React.useState({});
  const [projects, setProjects] = React.useState([]);
  const [project, setProject] = React.useState({ uid: "" });
  const authCtx = React.useContext(AuthContext);

  // firebase vars
  const db = ref(getDatabase(app));

  React.useEffect(() => {
    watchUserTaskList()
    return () => {
      for (var i = 0; i < tasks?.length; i++) {
        const removeListenerRef = child(db, `tasks/${tasks[i].uid}`)
        off(removeListenerRef)
      }
      let userTaskListRef = child(db, `users/${authCtx.user.uid}/tasks`)
      off(userTaskListRef)
    };
  }, [authCtx.user.uid, db]);

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

  const watchUserTaskList = () => {
    let userTaskListRef = child(db, `users/${authCtx.user.uid}/tasks`)
    onValue(userTaskListRef, (snapshot) => {
      let updatedTaskList = snapshot.val()
      refreshTaskWatchers(updatedTaskList)
    })
  }

  const refreshTaskWatchers = (updatedTaskList) => {
    // turn off existing watchers
    for (const task_uid in tasks) {
      let taskRef = child(db, `tasks/${task_uid}`)
      off(taskRef)
    }
    // set watchers on updated list of tasks
    for (const task_uid in updatedTaskList) {
      watchTask(task_uid)
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
    } else if (view === "list") {
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

  const clickCheck = () => {
    // require a name
    if (task?.name.length === 0) {
      return;
    }

    // edit or create?
    let mode = task.uid ? 'edit' : 'create'
    let task_uid = mode === 'edit' ? task.uid : push(child(db, "tasks")).key;
    task.owners = mode === 'edit' ? task.owners : { [authCtx.user.uid]: true };
    task.uid = task_uid;

    // update firebase
    const updates = {};

    // clear out any old project associations if they exist, then add task to project if a project is selected and if one is not selected then clear out the task project
    if (task.project !== "") {
      updates[`/projects/${task.project}/tasks/${task_uid}`] = {};
    }
    if (project.uid !== "") {
      task.project = project?.uid;
      updates[`/projects/${project.uid}/tasks/${task_uid}`] = true;
      for (const owner_uid in project.owners) {
        updates[`/users/${owner_uid}/tasks/${task_uid}`] = true;
      }
    } else {
      task.project = "";
    }

    updates["/tasks/" + task_uid] = task;
    updates[`/users/${authCtx.user.uid}/tasks/${task_uid}`] = true;

    update(db, updates)
      .then(() => {
        // make sure user.tasks is defined
        if (!authCtx.user.tasks) {
          let next = { ...authCtx.user, tasks: {} };
          authCtx.user = next;
        }
        authCtx.user = {
          ...authCtx.user,
          tasks: { ...authCtx.user.tasks, [task_uid]: true },
        };

        // watch new task if mode === 'create'
        if (mode === 'create') {
          watchTask(task_uid)
        }

        // reset UI vars
        setTask((prev) => {
          let next = {
            project: "",
            owners: {},
            name: "",
            uid: "",
          };
          return next;
        });
        setProject((prev) => {
          let next = {
            owners: {},
            name: "",
            value: "",
            uid: "",
          };
          return next;
        });
        setView((prev) => {
          return "list";
        });

      })
      .catch((error) => {
        setTask((prev) => {
          let next = {
            project: "",
            owners: {},
            name: "",
            uid: "",
          };
          return next;
        });
        console.log(error);
      });
  };

  const clickCheckbox = (item) => {
    item.checked = !item.checked;
    let updates = {};
    updates[`tasks/${item.uid}/checked`] = item.checked;
    update(db, updates).then(() => {
    });
  };

  const editTask = (item) => {
    setTask((prev) => {
      return item;
    });
    setView("create");
    setTimeout(() => {
      let inputs = document.getElementsByClassName("task-name");
      let input = inputs[0];
      input.focus();
    }, 100);
  };

  const deleteTask = (item) => {
    let updates = {}
    updates[`/tasks/${item.uid}`] = {}
    updates[`/archived_tasks/${item.uid}`] = item
    for (const user_uid in item.owners) {
      updates[`/users/${user_uid}/tasks/${item.uid}`] = {}
    }
    if (item.project !== '') {
      updates[`/projects/${item.project}/tasks/${item.uid}`] = {}
    }
    update(db, updates).then(() => {
      let next = authCtx.user.tasks
      delete next[item.uid]
      authCtx.user.tasks = next
      let taskRef = child(db, `/tasks/${item.uid}`)
      off(taskRef)
      setModal((prev) => {
        return {
          visible: false,
          action: '',
          data: {}
        }
      })
    })
  }

  const showConfirmDeleteTaskModal = (item) => {
    setModal((prev) => {
      return {
        visible: true,
        action: 'delete-task',
        data: item
      }
    })
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

  const confirm = () => {
    if (modal.action === 'delete-task') {
      let item = modal.data
      deleteTask(item)
    }
  };

  const deny = () => {
    setModal((prev) => {
      return {
        visible: false,
        action: '',
        data: {}
      }
    })
  };

  return (
    <>
      <div className="mobile-buttons">
        <svg
          className={view === "create" ? "plus create" : "plus list"}
          onClick={() => {
            clickPlus();
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
          className={view === "create" ? "check create" : "check list"}
          onClick={() => {
            clickCheck();
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

      {view === "list" && (
        <div className="content">
          {tasks.length === 0 && (
            <div className="no-items">You have no tasks.</div>
          )}
          {tasks.length > 0 && (
            <div className="items-list">
              {tasks?.map((task, i) => (
                <div className="item" key={i}>
                  <div className="checkbox-container">
                    <input
                      type="checkbox"
                      value={task.checked}
                      className={
                        task.checked
                          ? "checkbox-input checked"
                          : "checkbox-input"
                      }
                    />
                    <span
                      onClick={() => {
                        clickCheckbox(task);
                      }}
                      className="custom-checkbox"
                    ></span>
                  </div>
                  <div
                    className="text-container"
                    onClick={() => {
                      editTask(task);
                    }}
                  >
                    <span
                      className={
                        task.checked ? "item-title checked" : "item-title"
                      }
                    >
                      {task.name}
                    </span>
                  </div>
                  <svg
                    className="delete-task-button"
                    onClick={() => {
                      showConfirmDeleteTaskModal(task);
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

      {view === "create" && (
        <div className="content">
          <div className="create-form">
            <input
              value={task.name}
              onChange={(event) => taskNameChange(event)}
              onKeyDown={(event) => taskNameKeypress(event)}
              className="task-name"
              placeholder="Name"
              type="text"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default TasksPage;
