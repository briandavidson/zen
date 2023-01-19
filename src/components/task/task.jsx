import React from "react";
import "./task.scss";

const Task = ({data, clickCheckbox, editTask, showConfirmDeleteTaskModal}) => {
  return (
    <div className="item task">
      <div className="checkbox-container">
        <input
          type="checkbox"
          value={data.checked}
          className={data.checked ? "checkbox-input checked" : "checkbox-input"}
        />
        <span
          onClick={() => {
            clickCheckbox(data);
          }}
          className="custom-checkbox"
        ></span>
      </div>
      <div
        className="text-container"
        onClick={() => {
          editTask(data);
        }}
      >
        <span className={data.checked ? "item-title checked" : "item-title"}>
          {data.name}
        </span>
      </div>
      <svg
        className="delete-task-button"
        onClick={() => {
          showConfirmDeleteTaskModal(data);
        }}
        viewBox="0 0 100 100"
        width="40"
        height="40"
        stroke="white"
      >
        <line x1="30" y1="50" x2="70" y2="50" strokeWidth="5"></line>
        <line x1="50" y1="30" x2="50" y2="70" strokeWidth="5"></line>
      </svg>
    </div>
  );
};

export default Task;
