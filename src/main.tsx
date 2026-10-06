import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/manrope';
import './styles.css';
class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('Ошибка тренажёра',error,info.componentStack);}
  render(){return this.state.failed?<main className="fatal-error"><h1>Не удалось открыть тренажёр</h1><p>Попробуй перезагрузить страницу. Сохранённая история останется в браузере.</p><button className="button primary" onClick={()=>location.reload()}>Перезагрузить</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<StrictMode><ErrorBoundary><App/></ErrorBoundary></StrictMode>);
