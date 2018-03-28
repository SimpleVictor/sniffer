import * as React from 'react';
import Home from '../home';
import About from '../about';
import SpinnerComponent from '../../components/SpinnerComponent';

import { Route } from 'react-router-dom';
import { connect } from 'react-redux';
import { Component } from 'react';
import { bindActionCreators } from 'redux';
import { ToastContainer, style } from 'react-toastify';

style({
  width: "320px",
  colorSuccess: "#1AB04D",
  zIndex: 9999,
});

class App extends Component {
  constructor(public props: any) {
    super(props);
  }

  render() {
    const {
      spinner,
    } = this.props;
    return(
      <div className='app-container'>
        <SpinnerComponent spinner={spinner}/>
        <ToastContainer autoClose={5000} />
        <main className='main_container dogSVG'>
          <Route exact={true} path='/' component={Home} />
          <Route exact={true} path='/about-us' component={About} />
        </main>
      </div>
    )
  }
}

const mapStateToProps = state => ({
  router: state.router,
  spinner: state.spinner
});

const mapDispatchToProps = dispatch => bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);

