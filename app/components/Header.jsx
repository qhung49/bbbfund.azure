import React from 'react';
import axios from 'axios';
import LoginForm from './LoginForm';
import * as Utilities from './Utilities.js';

export default class Header extends React.Component {  
  
  constructor(props) {
    super(props);
    
    this.state = {
      time: Header.getDisplayTime(new Date())
    };
  }

  componentDidMount() {
    var now = new Date();
    if (Utilities.isBusinessHour(now)) {
      this.intervalID = setInterval(() => this.setState({
        time: Header.getDisplayTime(now)
      }), Utilities.refreshIntervalMs);
    } else {
      this.setState({
        time: "Outside market hours"
      });
    }
  }

  componentWillUnmount() {
    clearInterval(this.intervalID);
  }

  static getDisplayTime(date) {
    return "Current time: " + date.toLocaleString('vi-VN', {timeZone: 'Asia/Ho_Chi_Minh'});
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
            <p className="navbar-text">{this.state.time}</p>
            <ul className="nav navbar-nav navbar-right">
              {this.props.loggedIn ? <li><a href="#" onClick={this.props.onClick}>Logout</a></li> : <LoginForm />}
            </ul>
          </div>
        </div>
      </nav>
    );
  }
}