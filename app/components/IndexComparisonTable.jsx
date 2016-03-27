import React from 'react';

export default class IndexComparisonTable extends React.Component {
  render() {
    return (
      <table className="table table-bordered">
        <caption>Comparison to VN and VN30 Index</caption>
        <thead> 
          <tr> 
            <th />
            {this.props.data.map( (item) => <th className="text-right" key={item.name}>{item.name}</th>)}
          </tr> 
        </thead> 
        <tbody> 
          <tr> 
            <th scope="row">Current Index</th>{this.props.data.map( (item) => <td className="text-right" key={item.name}>{item.index.toFixed(2)}</td>)} 
          </tr> 
          <tr> 
            <th scope="row">Change (percentage)</th>{this.props.data.map( (item) => <td key={item.name} className={"text-right " + (item.percentageChange > 0 ? "success" : "danger")}>{item.percentageChange.toFixed(2)}</td>)} 
          </tr>
        </tbody>
      </table>
    );
  }
}