import React from 'react';
import axios from 'axios';
import Utilities from './Utilities';

export default class LoginForm extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      loginFailed: false
    }
  }
  
  login(event) {
    event.preventDefault();
    var authenticateSource = '/authenticate';
    if (process.env.NODE_ENV === 'development') {
      authenticateSource = 'http://localhost:1337' + authenticateSource;
    }
    
    axios.post(authenticateSource, {
      username: this.refs.username.value,
      password: this.refs.password.value
    })
      .then(function(response) {
        this.setState({
          loginFailed: false
        });
        localStorage.setItem("tokenJwt", response.data.token);
        location.reload(false);
      }.bind(this))
      .catch(function(response) {
        this.setState({
          loginFailed: true
        });
      }.bind(this));
  }
  
  render() {
    return (
      <li className="dropdown">
        <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Login <span className="caret" /></a>
        <div className="dropdown-menu">
          {this.state.loginFailed ? <div className="alert alert-danger">Login failed</div> : null}
          <form className="form">
            <input className="form-control input-sm" ref="username" type="text" placeholder="Username" required />
            <input className="form-control input-sm" ref="password" type="password" placeholder="Password" required />
            <button className="btn btn-primary" type="submit" style={{width: "50%"}} onClick={this.login.bind(this)}>Login </button> 
          </form>
        </div>
      </li>
    );
  }
}