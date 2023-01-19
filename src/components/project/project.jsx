import React from 'react'
import './project.scss'

const Project = ({data, selectProject, showConfirmDeleteProjectModal}) => {

  return (
    <div className="item">
      <div
        onClick={() => {
          selectProject(data);
        }}
        className="text-container"
      >
        <span className="item-title">{data.name}</span>
      </div>
      <svg
        className="delete-task-button"
        onClick={() => {
          showConfirmDeleteProjectModal(data);
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
  )
}

export default Project
