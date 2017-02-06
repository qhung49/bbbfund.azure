import React from 'react';
import axios from 'axios';
import Header from './Header';
import StockTable from './StockTable';
import StockActionContainer from './StockActionContainer';
import InvestorTable from './InvestorTable';
import InvestmentAddForm from './InvestmentAddForm';
import ContainerAllocationCharts from './ContainerAllocationCharts';
import IndexComparisonTable from './IndexComparisonTable';
import SummaryTable from './SummaryTable';
import IndexPerformanceGraph from './IndexPerformanceGraph';
import TransactionTable from './TransactionTable';

export default class App extends React.Component {
  
  constructor(props) {
    super(props);
    
    this.state = {
      loggedIn: null,
      investors: [],
      stocks: [],
      indexes: {
        timestamp:[],
        markets:[]
      },
      summary: {
        markets:[{name:'', index:0, percentageChange:0}],
        stockPurchaseValue: 0,
        stockCurrentValue: 0,
        cash:0,
        capital:0,
        profit:0,
        fee:0,
        dividend:0
      },
      transactions: null
    }
  }
  
  logout(event) {
    if (event) event.preventDefault();
    localStorage.removeItem('tokenJwt');
    console.log('tokenJwt removed');
    this.setState({
      loggedIn: null
    });
  }
  
  addInvestment(investment) {
    var source = 'api/protected/addInvestment';
    if (process.env.NODE_ENV === 'development') {
      source = 'http://localhost:1337/' + source;
    }
    
    return axios.post(source, investment)
      .then(function() {
        location.reload(false);
      })
      .catch(function(err) {
        if (err.status !== 500 && err.data.error) {  
          throw err.data.error;
        } else {
          throw "Server error, please try again later."
        }
      });
  }

  finalizeInvestment(investment) {
    var source = 'api/protected/finalizeInvestment';
    if (process.env.NODE_ENV === 'development') {
      source = 'http://localhost:1337/' + source;
    }

    return axios.post(source, investment)
      .then(function() {
        location.reload(false);
      })
      .catch(function(err) {
        if (err.status !== 500 && err.data.error) {  
          throw err.data.error;
        } else {
          throw "Server error, please try again later."
        }
      });
  }
  
  handleStockAction(type, data) {
    const sourceForType = {
      'sell': 'api/protected/sellStock',
      'buy': 'api/protected/buyStock',
      'dividend': 'api/protected/addDividend'
    };
    var source = sourceForType[type];
    if (process.env.NODE_ENV === 'development') {
      source = 'http://localhost:1337/' + source;
    }
    
    return axios.post(source, data)
      .then(function() {
        location.reload(false);
      })
      .catch(function(err) {
        if (err.status !== 500 && err.data.error) {
          throw err.data.error;
        } else {
          throw "Server error, please try again later."
        }
      });
  }
  
  getHomeData() {
    var homeDataSource = 'api/homeData';
    if (process.env.NODE_ENV === 'development') {
      homeDataSource = 'http://localhost:1337/' + homeDataSource;
    }
    
    axios.get(homeDataSource)
      .then(function (response) {
        this.setState({
          stocks: response.data.stocks,
          indexes: response.data.indexes,
          summary: response.data.summary
        })
      }.bind(this));
  }
  
  getInvestors() {
    var source = 'api/protected/investors';
    if (process.env.NODE_ENV === 'development') {
      source = 'http://localhost:1337/' + source;
    }
    
    return axios.get(source)
      .then(function (response) {
        this.setState({
          investors: response.data.investors
        })
      }.bind(this));
  }
  
  getTransactions() {
    var source = 'api/protected/transactions';
    if (process.env.NODE_ENV === 'development') {
      source = 'http://localhost:1337/' + source;
    }
    
    return axios.get(source)
      .then(function (response) {
        this.setState({
          transactions: response.data
        })
      }.bind(this));
  }
  
  getRefreshedToken(tokenJwt) {
    var source = '/refreshToken';
    if (process.env.NODE_ENV === 'development') {
      source = 'http://localhost:1337' + source;
    }
    return axios.post(source, {token: tokenJwt})
      .then(function(response) {
        this.setState({
          loggedIn: response.data.role
        });
        localStorage.setItem("tokenJwt", response.data.token);
        console.log('tokenJwt is refreshed');
        axios.defaults.headers.common['Authorization'] = 'Bearer ' + response.data.token;
      }.bind(this))
  }
  
  componentDidMount() {
    this.getHomeData();
    
    var tokenJwt = localStorage.getItem('tokenJwt');
    if (tokenJwt) {
      this.getRefreshedToken(tokenJwt)
        .then(this.getInvestors.bind(this))
        .catch(function(err) {
          this.logout(null);
        }.bind(this)); 
    }
    else {
      this.setState({
        loggedIn: null
      })
    }
  }
  
  // componentWillUnmount() {
  //   this.homeDataRequest.abort();
  // }
  
  render() {
    return (
      <div className="container">
        <Header loggedIn={this.state.loggedIn} onClick={this.logout.bind(this)} />
        <StockTable data={this.state.stocks} />
        {this.state.loggedIn && this.state.loggedIn === 'admin' ? <StockActionContainer handleStockAction={this.handleStockAction.bind(this)} /> : null}
        {this.state.loggedIn ? <InvestorTable data={this.state.investors} /> : null}
        {this.state.loggedIn && this.state.loggedIn === 'admin' ? <InvestmentAddForm addInvestment={this.addInvestment.bind(this)} /> : null}
        <ContainerAllocationCharts stocks={this.state.stocks} />
        <div className="row">
          <div className="col-sm-6">
            <SummaryTable data={this.state.summary} loggedIn={this.state.loggedIn} />
          </div>
          <div className="col-sm-6">
            <IndexComparisonTable data={this.state.summary.markets} />
          </div>
        </div>
        <IndexPerformanceGraph data={this.state.indexes} />
        {this.state.loggedIn ? 
          <TransactionTable data={this.state.transactions} 
                            loggedIn={this.state.loggedIn}
                            getTransactions={this.getTransactions.bind(this)} 
                            finalizeInvestment={this.finalizeInvestment.bind(this)} /> 
          : null}
      </div>
    );
  }
}