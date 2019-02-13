import React from 'react';
import axios from 'axios';
import LoginForm from './LoginForm';
import * as Utilities from './Utilities.js';

export default class Header extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      displayTime: "Outside market hours",
    }
  }

  componentDidMount() {
    const displayTimeRefreshIntervalMs = 1000;
    if (Utilities.isBusinessHour(new Date())) {
      this.displayTimeInterval = setInterval(() => this.setState({
          displayTime: Header.getDisplayTime(new Date())
        }), displayTimeRefreshIntervalMs);
    }
  }

  componentWillUnmount() {
    if (this.displayTimeInterval !== undefined) {
      clearInterval(this.displayTimeInterval); 
    }
  }

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
            <p className="navbar-text">{this.state.displayTime}</p>
            <ul className="nav navbar-nav navbar-right">
              {this.props.loggedIn ? <li><a href="#" onClick={this.props.onClick}>Logout</a></li> : <LoginForm />}
            </ul>
          </div>
        </div>
      </nav>
    );
  }

  static getDisplayTime(date) {
    return "Current time: " + date.toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'});
  }
}