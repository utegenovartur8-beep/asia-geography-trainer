import { lazy, Suspense } from 'react';
import { ArrowRight, BookOpen, GraduationCap, RotateCcw, Map, ListChecks, Shuffle, Trophy, Target, Flame, Check, Play, Globe2, Sparkles, ArrowUpRight } from 'lucide-react';
import { countries } from '../data/countries';
import { summarize, taskFields, type Mode, type Settings, type TaskType } from '../lib/engine';
import type { SavedData } from '../lib/storage';
const AsiaMap = lazy(()=>import('./AsiaMap'));
export const modeNames: Record<Mode,string> = {learn:'Обучение',exam:'Экзамен',review:'Работа над ошибками'};
export const taskNames: Record<TaskType,string> = {map:'Только карта',capitals:'Карта и столицы',characteristics:'Только характеристики',full:'Полный режим'};
const modes = [
  {id:'learn' as const,icon:BookOpen,title:'Обучение',description:'В своём темпе, с разбором ответов'},
  {id:'exam' as const,icon:GraduationCap,title:'Экзамен',description:'Проверь себя без подсказок'},
  {id:'review' as const,icon:RotateCcw,title:'Работа над ошибками',description:'Повтори то, что пока не запомнил'},
];
const types = [{id:'map' as const,icon:Map},{id:'capitals' as const,icon:Globe2},{id:'characteristics' as const,icon:ListChecks},{id:'full' as const,icon:Sparkles}];
export function Home({data,onSettings,onStart,onResume,onAtlas,onStats}:{data:SavedData;onSettings:(s:Partial<Settings>)=>void;onStart:(random?:boolean)=>void;onResume:()=>void;onAtlas:()=>void;onStats:()=>void}) {
  const {settings,attempts,mistakes,session}=data;
  const summaries=attempts.map(a=>summarize(a.results));
  const best=summaries.length?Math.max(...summaries.map(s=>s.percent)):null;
  const total=summaries.reduce((n,s)=>n+s.total,0),score=summaries.reduce((n,s)=>n+s.score,0);
  const eligible=Object.values(mistakes).filter(fs=>fs.some(f=>taskFields[settings.taskType].includes(f))).length;
  const actualCount=Math.min(settings.count==='all'?48:Number(settings.count),settings.mode==='review'?eligible:48);
  return <>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><span className="hero-dot"/> ГЕОГРАФИЯ СТАНОВИТСЯ БЛИЖЕ</div><h1>Большая Азия.<br/><span>Твои маленькие победы.</span></h1><p>От первого клика на карте до уверенного ответа у доски.<br className="desktop-only"/> Изучай страны, проверяй себя и замечай свой прогресс.</p><div className="hero-pills"><span><Globe2 size={15}/>48 стран</span><span><ListChecks size={15}/>6 навыков</span><span><BookOpen size={15}/>По школьной таблице</span></div></div>
      <div className="hero-visual" aria-hidden="true"><div className="globe-orbit orbit-one"/><div className="globe-orbit orbit-two"/><Suspense fallback={<div className="map-loading"/>}><AsiaMap decorative/></Suspense><div className="hero-map-label"><span className="live-dot"/> ТВОЯ СЛЕДУЮЩАЯ ЭКСПЕДИЦИЯ</div><span className="map-coordinates">34° N &nbsp; 100° E</span></div>
    </section>
    <div className="home-layout"><section className="panel setup-panel" aria-labelledby="setup-heading"><div className="section-top"><div><div className="eyebrow muted">КАЖДОЕ ПУТЕШЕСТВИЕ — С ПЕРВОГО ШАГА</div><h2 id="setup-heading">Настрой свою тренировку</h2></div><span className="step-badge">01 — 03</span></div>
      <fieldset><legend><span className="step-number">1</span> Как будем заниматься?</legend><div className="mode-grid">{modes.map(m=><button key={m.id} className={`mode-card ${settings.mode===m.id?'active':''}`} aria-pressed={settings.mode===m.id} onClick={()=>onSettings({mode:m.id})}><span className="mode-icon"><m.icon size={22}/></span><span className="selection-dot">{settings.mode===m.id&&<Check size={11}/>}</span><strong>{m.title}</strong><span>{m.description}</span></button>)}</div></fieldset>
      <fieldset><legend><span className="step-number">2</span> Что хочешь потренировать?</legend><div className="type-grid">{types.map(t=><button key={t.id} className={`type-button ${settings.taskType===t.id?'active':''}`} onClick={()=>onSettings({taskType:t.id})} aria-pressed={settings.taskType===t.id}><t.icon size={17}/>{taskNames[t.id]}</button>)}</div></fieldset>
      <fieldset className="count-row"><legend><span className="step-number">3</span> Сколько стран пройдём?</legend><div className="count-options">{(['10','20','all'] as const).map(n=><button key={n} className={settings.count===n?'active':''} onClick={()=>onSettings({count:n})} aria-pressed={settings.count===n}>{n==='all'?'Все 48':n}</button>)}</div><span className="count-hint">{settings.mode==='review'?`${eligible} стран с ошибками в выбранных заданиях`:'Новый набор — каждую тренировку'}</span></fieldset>
      {settings.mode==='review' && !eligible && <p className="notice">{Object.keys(mistakes).length?'В выбранных заданиях ошибок нет. Попробуй полный режим.':'Здесь появятся задания, в которых ты ошибся. Сначала пройди обучение или экзамен.'}</p>}
      <div className="start-row"><button className="button primary start-button" onClick={()=>onStart()} disabled={!actualCount}><Play size={18} fill="currentColor"/>Начать <span>· {actualCount} стран</span><ArrowRight size={19}/></button><button className="random-button" onClick={()=>onStart(true)} disabled={!actualCount}><Shuffle size={18}/><span>Случайная страна</span></button></div>
      <div className="setup-note"><Check size={14}/> Прогресс сохраняется на этом устройстве</div>
      {session && <button className="resume-button" onClick={onResume}><RotateCcw size={17}/><span>Продолжить: {modeNames[session.mode]}, задание {session.index+1} из {session.questions.length}</span><ArrowRight size={17}/></button>}
    </section>
    <aside className="home-sidebar"><section className="panel progress-panel"><div className="section-top"><h2>Твой прогресс</h2><span className="soft-icon"><Trophy size={20}/></span></div><div className="best-result"><strong>{best===null?'—':best}<span>{best!==null?'%':''}</span></strong><span>лучший результат</span></div><div className="progress-rule"/><div className="mini-stat"><span><Check size={17}/>Завершено попыток</span><strong>{attempts.length}</strong></div><div className="mini-stat"><span><Target size={17}/>Точность ответов</span><strong>{total?`${Math.round(score/total*100)}%`:'—'}</strong></div><div className="mini-stat"><span><Flame size={17}/>Лучшая серия</span><strong>{summaries.length?Math.max(...summaries.map(s=>s.bestStreak)):0}</strong></div><button className="text-button progress-link" onClick={onStats}>Вся статистика<ArrowUpRight size={17}/></button></section>
    <section className="atlas-promo"><div className="atlas-icon"><BookOpen size={24}/></div><div className="eyebrow">ТВОЙ КАРМАННЫЙ АТЛАС</div><h3>Сначала познакомимся?</h3><p>Все {countries.length} стран и их характеристики в одном справочнике.</p><button className="text-button" onClick={onAtlas}>Открыть страны <ArrowRight size={17}/></button></section></aside></div>
    <section className="how-it-works"><div><span className="how-icon"><Map size={21}/></span><div><h3>Найди на карте</h3><p>Тренируй географическую память</p></div></div><div><span className="how-icon purple"><ListChecks size={21}/></span><div><h3>Вспомни главное</h3><p>Столицы, устройство и экономика</p></div></div><div><span className="how-icon green"><Trophy size={21}/></span><div><h3>Закрепи результат</h3><p>Разбирай ошибки и становись увереннее</p></div></div></section>
  </>;
}
