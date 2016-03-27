import React from 'react';
import axios from 'axios';
import LoginForm from './LoginForm';

export default class Header extends React.Component {  
  render() {
    return (
      <nav className="navbar navbar-inverse">
        <div className="container-fluid">
          <div className="navbar-header">
            <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#header-navbar-collapse" aria-expanded="false">
              <span className="sr-only">Toggle navigation</span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
              <span className="icon-bar"></span>
            </button>
            <a className="navbar-brand" href="#">
              <img src="logo.jpg" alt="BBBFund Logo" height="48px" className="logo" />
            </a>
          </div>
          
          <div className="collapse navbar-collapse" id="header-navbar-collapse">
            <ul className="nav navbar-nav">
              <li className="active"><a href="#">Home <span className="sr-only">(current)</span></a></li>
            </ul>
            <ul className="nav navbar-nav navbar-right">
              {this.props.loggedIn ? <li><a href="#" onClick={this.props.onClick}>Logout</a></li> : <LoginForm />}
            </ul>
          </div>
        </div>
      </nav>
    );
  }
}