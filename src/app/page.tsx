'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  useEffect(() => {
    document.querySelectorAll('[data-tabs]').forEach((group) => {
      const el = group as HTMLElement;
      const tabs = Array.from(el.querySelectorAll('[role="tab"]')) as HTMLElement[];
      const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls') || ''));
      function select(i: number, focus: boolean) {
        tabs.forEach((t, j) => {
          const on = i === j;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          (t as HTMLButtonElement).tabIndex = on ? 0 : -1;
          if (panels[j]) (panels[j] as HTMLElement).hidden = !on;
        });
        if (focus) tabs[i].focus();
      }
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(i, false));
        t.addEventListener('keydown', (e) => {
          const ke = e as KeyboardEvent;
          let n: number | null = null;
          if (ke.key === 'ArrowRight' || ke.key === 'ArrowDown') n = (i + 1) % tabs.length;
          else if (ke.key === 'ArrowLeft' || ke.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
          else if (ke.key === 'Home') n = 0;
          else if (ke.key === 'End') n = tabs.length - 1;
          if (n !== null) { ke.preventDefault(); select(n, true); }
        });
      });
    });
    const toggle = document.querySelector('.nav-toggle') as HTMLButtonElement | null;
    const menu = document.getElementById('menu');
    function setMenu(open: boolean) {
      if (!toggle || !menu) return;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('open', open);
    }
    toggle?.addEventListener('click', () => { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    menu?.addEventListener('click', (e) => { if ((e.target as Element).closest('a')) setMenu(false); });
    // Geo-based pricing: INR for India, USD for everyone else.
    type PlanEntry = { sym: string; amt: string; per: string; note: string };
    type PlanSet = Record<string, PlanEntry>;
    const PLANS_INR: PlanSet = {
      weekly:  { sym: '\u20B9', amt: '299',   per: 'per week',  note: 'Good for a short, focused job hunt.' },
      monthly: { sym: '\u20B9', amt: '699',   per: 'per month', note: 'Good for a steady job search.' },
      yearly:  { sym: '\u20B9', amt: '4,999', per: 'per year',  note: 'About \u20B9416 a month. Save over 50\u0025 vs monthly.' },
    };
    const PLANS_USD: PlanSet = {
      weekly:  { sym: '$', amt: '4',  per: 'per week',  note: 'Good for a short, focused job hunt.' },
      monthly: { sym: '$', amt: '9',  per: 'per month', note: 'Good for a steady job search.' },
      yearly:  { sym: '$', amt: '59', per: 'per year',  note: 'About $4.90 a month. Save over 45\u0025 vs monthly.' },
    };
    let PLANS = PLANS_USD;
    let activePlan = 'monthly';

    function applyPlan(planKey: string, plans: PlanSet) {
      activePlan = planKey;
      const p = plans[planKey];
      const cur = document.getElementById('cur');
      const amt = document.getElementById('amt');
      const per = document.getElementById('per');
      const pnote = document.getElementById('pnote');
      const freeCur = document.getElementById('free-cur');
      const finePrint = document.getElementById('fine-print');
      if (cur) cur.textContent = p.sym;
      if (freeCur) freeCur.textContent = p.sym;
      if (amt) amt.textContent = p.amt;
      if (per) per.textContent = p.per;
      if (pnote) pnote.textContent = p.note;
      if (finePrint) {
        finePrint.textContent = plans === PLANS_INR
          ? 'All prices are in Indian rupees (\u20B9). Taxes are added where they apply.'
          : 'All prices are in USD. Taxes may be added where applicable.';
      }
    }

    const btns = Array.from(document.querySelectorAll('.bill button')) as HTMLButtonElement[];
    btns.forEach((b) => {
      b.addEventListener('click', () => {
        btns.forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        applyPlan(b.getAttribute('data-plan') || 'monthly', PLANS);
      });
    });

    // Detect country; default monthly plan on load.
    applyPlan('monthly', PLANS);
    fetch('https://ip-api.com/json/?fields=countryCode', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { countryCode?: string }) => {
        PLANS = d.countryCode === 'IN' ? PLANS_INR : PLANS_USD;
        applyPlan(activePlan, PLANS);
      })
      .catch(() => { /* stay on USD default */ });

    const yr = document.getElementById('yr');
    if (yr) yr.textContent = String(new Date().getFullYear());
  }, []);

  return (
    <>
      <style>{`
        :root{--mint:#edf7f5;--ink:#1a2724;--body:#384f49;--muted:#5a6f69;--forest:#48835a;--forest-dk:#3b7050;--pine:#1c4a35;--pine-2:#2d6a4f;--brick:#8a3a2a;--brick-tint:#f7e9e5;--sage:#dcebe5;--aqua:#d6f1ee;--sky:#e4eef7;--lime:#ecf9c6;--olive:#56650f;--line:#d5e2de;--line-soft:#e4eeeb;--wrap:1180px;--gut:clamp(20px,4vw,40px);--sec:clamp(72px,9vw,120px);--sans:"Hanken Grotesk",system-ui,sans-serif;--serif:"Source Serif 4",Georgia,serif}
        *,*::before,*::after{box-sizing:border-box}html{scroll-padding-top:84px}@media (prefers-reduced-motion:no-preference){html{scroll-behavior:smooth}}body{margin:0;background:var(--mint);color:var(--body);font-family:var(--sans);font-size:1.0625rem;line-height:1.6;-webkit-font-smoothing:antialiased}svg{display:block;max-width:100%}h1,h2,h3,h4,p,ul,ol,figure,blockquote,table{margin:0}ul,ol{padding:0;list-style:none}a{color:inherit}button{font:inherit;color:inherit;cursor:pointer}[hidden]{display:none !important}:focus-visible{outline:3px solid var(--pine-2);outline-offset:3px;border-radius:6px}.wrap{width:min(100% - 2 * var(--gut),var(--wrap));margin-inline:auto}.sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.i{width:1.25em;height:1.25em;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex:none}
        .btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;padding:.7rem 1.15rem;border-radius:10px;border:1px solid transparent;font-weight:600;font-size:1rem;line-height:1.2;text-decoration:none;white-space:nowrap;transition:background-color .15s,border-color .15s,color .15s}.btn-primary{background:var(--forest);color:#fff}.btn-primary:hover{background:var(--forest-dk)}.btn-ghost{background:#fff;border-color:var(--line);color:var(--ink)}.btn-ghost:hover{border-color:var(--forest)}.btn-light{background:var(--lime);color:var(--pine)}.btn-light:hover{background:#fff}.btn-lg{padding:1rem 1.6rem;font-size:1.0625rem;border-radius:12px}.btn-sm{padding:.55rem 1rem;font-size:.9375rem}
        .nav{position:sticky;top:0;z-index:50;background:rgba(237,247,245,.94);backdrop-filter:saturate(1.4) blur(8px);border-bottom:1px solid var(--line-soft)}.nav-in{display:flex;align-items:center;gap:2rem;min-height:72px}.brand{display:inline-flex;align-items:center;gap:.65rem;text-decoration:none}.brand-mark{width:38px;height:38px}.brand-word{font-family:var(--serif);font-weight:700;font-size:1.5rem;letter-spacing:-.01em;color:var(--pine)}.brand-word span{color:var(--brick)}.menu{display:flex;gap:1.75rem;margin-inline:auto}.menu a{text-decoration:none;font-weight:500;padding:.4rem 0;color:var(--body)}.menu a:hover{color:var(--ink)}.only-m{display:none}.nav-cta{display:flex;align-items:center;gap:1.1rem}.nav-cta .link{text-decoration:none;font-weight:500}.nav-toggle{display:none;align-items:center;justify-content:center;width:44px;height:44px;border-radius:10px;border:1px solid var(--line);background:#fff;color:var(--ink)}.nav-toggle .ic-x{display:none}.nav-toggle[aria-expanded="true"] .ic-x{display:block}.nav-toggle[aria-expanded="true"] .ic-menu{display:none}@media (max-width:900px){.nav-in{gap:.9rem}.nav-cta{margin-left:auto}.nav-cta .link{display:none}.nav-toggle{display:inline-flex}.menu{display:none;position:absolute;top:100%;left:0;right:0;flex-direction:column;gap:0;margin:0;padding:.25rem var(--gut) 1rem;background:var(--mint);border-bottom:1px solid var(--line)}.menu.open{display:flex}.menu a{padding:.9rem 0;border-top:1px solid var(--line-soft)}.only-m{display:block}}@media (max-width:480px){.brand-mark{width:32px;height:32px}.brand-word{font-size:1.25rem}}
        .hero{padding-block:clamp(56px,8vw,104px) clamp(36px,5vw,64px);text-align:center}.h1{font-size:clamp(2.4rem,8.2vw,5.75rem);font-weight:800;letter-spacing:-.04em;line-height:.98;color:var(--ink)}.h1 .line{display:block}.lede{max-width:44rem;margin:1.75rem auto 0;font-size:clamp(1.125rem,2vw,1.3125rem);line-height:1.5}.cta-row{display:flex;flex-wrap:wrap;gap:.9rem;justify-content:center;margin-top:2.25rem}.fine{margin-top:1rem;font-size:.9375rem;color:var(--muted)}.section .cta-row{margin-top:3rem}@media (prefers-reduced-motion:no-preference){.hero .line{animation:rise .8s cubic-bezier(.2,.7,.2,1) both}.hero .line:nth-child(2){animation-delay:.12s}.hero .lede{animation:rise .8s .3s cubic-bezier(.2,.7,.2,1) both}.hero .cta-row,.hero .fine{animation:rise .8s .42s cubic-bezier(.2,.7,.2,1) both}}@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes ring{from{stroke-dashoffset:276.46}to{stroke-dashoffset:60.8}}
        .tour{padding-bottom:clamp(40px,5vw,64px)}.tabs{display:flex;gap:.5rem;overflow-x:auto;padding:4px 4px 0;margin-bottom:1.5rem;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}.tabs > :first-child{margin-left:auto}.tabs > :last-child{margin-right:auto}.tab{display:inline-flex;align-items:center;gap:.65rem;padding:.6rem 1rem .8rem;background:none;border:0;border-bottom:3px solid transparent;font-weight:600;color:var(--body);white-space:nowrap}.tab:hover{color:var(--ink)}.tab[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--forest)}.sq{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;color:var(--pine);flex:none}.sq-sage{background:var(--sage)}.sq-aqua{background:var(--aqua)}.sq-sky{background:var(--sky)}.sq-lime{background:var(--lime)}.panel{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(24px,4vw,56px);align-items:center;padding:clamp(22px,4.5vw,56px);border-radius:28px}.panel-sage{background:var(--sage)}.panel-aqua{background:var(--aqua)}.panel-sky{background:var(--sky)}.panel-lime{background:var(--lime)}.h3{font-size:clamp(1.6rem,2.9vw,2.3rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;color:var(--ink)}.panel-copy p{margin-top:1rem}.ticks{margin-top:1.4rem;display:grid;gap:.7rem}.ticks li{display:flex;gap:.65rem;align-items:flex-start;font-weight:500;color:var(--ink)}.ticks .i{color:var(--forest);margin-top:.2em}@media (max-width:860px){.panel{grid-template-columns:minmax(0,1fr)}}
         .win{background:#fff;border-radius:16px;overflow:hidden}.win-head{display:flex;justify-content:space-between;align-items:center;gap:.75rem 1rem;flex-wrap:wrap;padding:1rem 1.25rem;border-bottom:1px solid var(--line-soft)}.win-title{font-weight:700;color:var(--ink);line-height:1.3}.win-sub{font-size:.875rem;color:var(--muted);line-height:1.35}.win-body{padding:1.25rem}.win-foot{padding:.85rem 1.25rem;background:#f5faf9;border-top:1px solid var(--line-soft);font-size:.875rem;color:var(--muted)}.job{display:flex;align-items:center;gap:.75rem}.job-ico{display:grid;place-items:center;width:40px;height:40px;border-radius:11px;background:var(--sky);color:var(--pine);flex:none}.job-tags{display:flex;gap:.4rem;flex-wrap:wrap}.tag{display:inline-flex;padding:.2rem .65rem;border-radius:999px;background:var(--sky);color:var(--ink);font-size:.8125rem;font-weight:600;white-space:nowrap}.tag-lime{background:var(--lime)}
        .fit{display:grid;grid-template-columns:150px minmax(0,1fr);gap:1.5rem;align-items:center}.score{text-align:center}.ring-wrap{position:relative;width:132px;height:132px;margin-inline:auto;border:none!important;outline:none!important;background:transparent!important;box-shadow:none!important}.ring{width:100%;height:100%;transform:rotate(-90deg);border:none!important;outline:none!important}.ring-bg{fill:none;stroke:var(--sage);stroke-width:10}.ring-fg{fill:none;stroke:var(--forest);stroke-width:10;stroke-linecap:round;stroke-dasharray:276.46;stroke-dashoffset:60.8}.ring-num{position:absolute;inset:0;display:grid;place-items:center;font-size:2.4rem;font-weight:800;letter-spacing:-.04em;color:var(--ink)}.ring-num small{font-size:1rem;font-weight:700;margin-left:2px}.score-label{margin-top:.6rem;font-weight:800;color:var(--ink)}.score-note{font-size:.875rem;color:var(--muted);line-height:1.4;margin-top:.15rem}.reqs-cap{font-size:.8125rem;color:var(--muted);margin-bottom:.5rem}.reqs{display:grid;gap:.55rem}.req{display:grid;grid-template-columns:28px minmax(0,1fr);gap:.75rem;align-items:start;padding:.6rem .75rem;border-radius:12px;background:#f5faf9}.st{display:grid;place-items:center;width:28px;height:28px;border-radius:50%}.st .i{width:16px;height:16px}.req.ok .st{background:var(--sage);color:var(--pine)}.req.part .st{background:var(--lime);color:var(--olive)}.req.gap .st{background:var(--brick-tint);color:var(--brick)}.req-t{font-weight:600;color:var(--ink);line-height:1.3}.req-d{font-size:.875rem;color:var(--muted);line-height:1.35}@media (max-width:560px){.fit{grid-template-columns:minmax(0,1fr)}}
        .evid{display:grid;gap:.9rem}.pair{display:grid;grid-template-columns:minmax(0,.8fr) 28px minmax(0,1.3fr);align-items:center;gap:.5rem}.pair-req{padding:.7rem .85rem;border-radius:12px;background:var(--aqua);font-weight:600;font-size:.9375rem;line-height:1.3;color:var(--ink)}.pair-link{display:grid;place-items:center;color:var(--forest)}.pair-ev{padding:.7rem .85rem;border-radius:12px;border:1px solid var(--line);background:#fff}.ev-t{font-weight:500;font-size:.9375rem;line-height:1.35;color:var(--ink)}.ev-src{display:flex;align-items:flex-start;gap:.4rem;margin-top:.35rem;font-size:.8125rem;line-height:1.35;color:var(--muted)}.pair.gap .pair-req{background:var(--brick-tint)}.pair.gap .pair-link{color:var(--brick)}.pair.gap .pair-ev{border:1.5px dashed rgba(138,58,42,.45);background:#fffaf9}.pair.gap .ev-t{color:var(--brick);font-weight:600}@media (max-width:560px){.pair{grid-template-columns:minmax(0,1fr);gap:.35rem}.pair-link{height:22px;transform:rotate(90deg)}}
        .lines{display:grid;gap:.7rem}.line-item{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:.75rem;align-items:start;padding:.8rem .9rem;border-radius:12px;border:1px solid var(--line-soft);background:#fff}.line-item p{font-size:.9375rem;line-height:1.4;color:var(--ink)}.badge{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--sage);color:var(--pine)}.chip{display:inline-flex;padding:.2rem .6rem;border-radius:999px;background:var(--sage);color:var(--pine);font-size:.75rem;font-weight:700;white-space:nowrap}.line-item.block{grid-template-columns:28px minmax(0,1fr);background:var(--brick-tint);border-color:rgba(138,58,42,.3)}.line-item.block .badge{background:#fff;color:var(--brick)}.block-note{margin-top:.35rem;font-size:.875rem !important;color:var(--brick) !important}.row-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem}.mini{display:inline-flex;padding:.35rem .8rem;border-radius:8px;border:1px solid var(--pine);background:var(--pine);color:#fff;font-weight:600;font-size:.8125rem}.mini-ghost{background:transparent;color:var(--pine)}
        .talk{display:grid;gap:.8rem}.talk-item{padding:.9rem 1rem;border-radius:12px;background:#f5faf9;border-left:4px solid var(--forest)}.talk-item.gap{background:#fdf6f4;border-left-color:var(--brick)}.pill{display:inline-flex;padding:.15rem .6rem;border-radius:999px;font-size:.75rem;font-weight:700;background:var(--sage);color:var(--pine)}.pill-gap{background:var(--brick-tint);color:var(--brick)}.talk-item h4{margin-top:.4rem;font-size:1rem;font-weight:700;line-height:1.3;color:var(--ink)}.talk-item p{margin-top:.25rem;font-size:.9375rem;line-height:1.5}@media (prefers-reduced-motion:no-preference){.panel:not([hidden]) .ring-fg{animation:ring 1.4s .55s cubic-bezier(.2,.7,.2,1) both}.panel:not([hidden]) .stagger > *{animation:pop .5s cubic-bezier(.2,.7,.2,1) var(--d,0s) both}.stagger > :nth-child(1){--d:.35s}.stagger > :nth-child(2){--d:.5s}.stagger > :nth-child(3){--d:.65s}.stagger > :nth-child(4){--d:.8s}}
        .promises{padding-bottom:var(--sec)}.promises-in{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.promise{display:flex;gap:.9rem;align-items:flex-start;padding:0 clamp(16px,3vw,40px)}.promise:first-child{padding-left:0}.promise + .promise{border-left:1px solid var(--line)}.promise h3{font-size:1.0625rem;font-weight:700;line-height:1.3;color:var(--ink)}.promise p{margin-top:.2rem;font-size:.9688rem;line-height:1.45}@media (max-width:820px){.promises-in{grid-template-columns:minmax(0,1fr);gap:1.5rem}.promise,.promise:first-child{padding:0}.promise + .promise{border-left:0;border-top:1px solid var(--line);padding-top:1.5rem}}
        .section{padding-block:var(--sec)}.bg-white{background:#fff}.h2{font-size:clamp(2rem,4.4vw,3.4rem);font-weight:800;letter-spacing:-.035em;line-height:1.04;color:var(--ink)}.lede-sm{margin-top:1.1rem;font-size:1.1875rem;line-height:1.55}.center{text-align:center;margin-inline:auto}.h2.center,.lede-sm.center{max-width:46rem}
        .split{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.25fr);gap:clamp(32px,6vw,80px);align-items:center}.closing{margin-top:1.75rem;font-family:var(--serif);font-size:1.5rem;font-weight:600;line-height:1.3;color:var(--pine)}.compare{width:100%;border-collapse:separate;border-spacing:0}.compare th,.compare td{padding:1rem 1.1rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--line-soft)}.compare thead th{font-size:.9375rem;font-weight:700;color:var(--muted);border-bottom:2px solid var(--line)}.compare thead th:last-child{background:var(--forest);color:#fff;border-radius:14px 14px 0 0;border-bottom:0}.compare tbody th{width:27%;font-weight:700;color:var(--ink)}.compare td:nth-child(2){color:var(--muted)}.compare td:last-child{background:var(--sage);color:var(--ink);font-weight:600}.compare tbody tr:last-child td:last-child{border-radius:0 0 14px 14px}.compare tbody tr:last-child th,.compare tbody tr:last-child td{border-bottom:0}.cell{display:flex;gap:.55rem;align-items:flex-start}.cell .no{color:var(--brick)}.cell .yes{color:var(--forest)}@media (max-width:900px){.split{grid-template-columns:minmax(0,1fr)}}
        .steps{position:relative;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:1.25rem;margin-top:3.5rem}.steps::before{content:"";position:absolute;top:24px;left:10%;right:10%;height:2px;background:var(--line)}.step{position:relative;text-align:center;padding-inline:.25rem}.step-n{position:relative;z-index:1;display:grid;place-items:center;width:48px;height:48px;margin:0 auto 1rem;border-radius:50%;background:#fff;border:2px solid var(--line);font-weight:800;color:var(--pine)}.step:nth-child(even) .step-n{background:var(--sky);border-color:var(--sky)}.step:last-child .step-n{background:var(--forest);border-color:var(--forest);color:#fff}.step h3{font-size:1.25rem;font-weight:800;letter-spacing:-.02em;color:var(--ink)}.step p{margin-top:.4rem;font-size:.9688rem;line-height:1.5}@media (max-width:900px){.steps{grid-template-columns:minmax(0,1fr);gap:1.75rem;margin-top:2.5rem}.steps::before{top:24px;bottom:24px;left:23px;right:auto;width:2px;height:auto}.step{display:grid;grid-template-columns:48px minmax(0,1fr);column-gap:1rem;text-align:left;padding:0}.step-n{grid-row:span 2;margin:0}}
        .ex-head{max-width:46rem}.ex > *{min-width:0}.ex{display:grid;grid-template-columns:230px minmax(0,1fr);gap:clamp(20px,4vw,48px);margin-top:2.75rem}.role-tabs{display:flex;flex-direction:column;gap:.35rem}.role{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.85rem 1rem;border-radius:12px;border:1px solid transparent;background:none;text-align:left;font-weight:600;color:var(--body)}.role:hover{background:var(--mint)}.role[aria-selected="true"]{background:var(--mint);border-color:var(--line);color:var(--ink)}.role[aria-selected="true"]::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--forest);flex:none}.ex-cap{margin-top:.75rem;padding-inline:1rem;font-size:.875rem;color:var(--muted);line-height:1.45}.ba-wrap{display:grid;gap:1rem}.ba{padding:1.5rem 1.75rem;border-radius:20px}.ba-label{margin-bottom:.5rem;font-size:.875rem;font-weight:700}.before{background:#f2f5f4;color:var(--muted)}.before .ba-text{text-decoration:line-through;font-size:1.125rem}.after{background:var(--sage);color:var(--pine)}.after .ba-text{font-family:var(--serif);font-size:clamp(1.3rem,2.4vw,1.75rem);font-weight:600;line-height:1.35;color:var(--ink)}.ba-src{display:flex;align-items:center;gap:.5rem;margin-top:1rem;font-size:.9rem;font-weight:600;color:var(--pine)}.note{display:flex;gap:.8rem;align-items:flex-start;margin-top:1rem;padding:1rem 1.25rem;border-radius:14px;background:var(--lime);color:var(--ink);font-weight:500}.note .i{margin-top:.15em;color:var(--pine)}@media (max-width:820px){.ex{grid-template-columns:minmax(0,1fr)}.role-tabs{flex-direction:row;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.role-tabs::-webkit-scrollbar{display:none}.role{white-space:nowrap}.role[aria-selected="true"]::after{display:none}.ex-cap{padding-inline:0;margin-top:0}}
         .todo{display:none}.quotes{columns:3 300px;column-gap:1.25rem;margin-top:3rem}.quote{break-inside:avoid;margin:0 0 1.25rem;padding:1.6rem;border-radius:20px;background:#fff}.quote.t-aqua{background:var(--aqua)}.quote.t-lime{background:var(--lime)}.quote blockquote p{font-family:var(--serif);font-size:1.1875rem;line-height:1.5;color:var(--ink)}.result{display:inline-flex;margin-top:1rem;padding:.25rem .7rem;border-radius:999px;background:var(--sage);color:var(--pine);font-size:.8125rem;font-weight:700}.t-aqua .result,.t-lime .result{background:#fff}.who{display:flex;align-items:center;gap:.8rem;margin-top:1.25rem}.av{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--sky);color:var(--pine);font-weight:800;flex:none}.who-n{font-weight:700;line-height:1.2;color:var(--ink)}.who-r{font-size:.875rem;line-height:1.3;color:var(--muted)}
        .bill{display:inline-flex;padding:.3rem;margin-top:2rem;border-radius:12px;background:var(--mint);border:1px solid var(--line)}.bill button{padding:.55rem 1.1rem;border:0;border-radius:9px;background:none;font-weight:600;color:var(--body)}.bill button[aria-pressed="true"]{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(26,39,36,.18)}.plans{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.25rem;max-width:920px;margin:2.5rem auto 0;text-align:left}.plan{display:flex;flex-direction:column;padding:clamp(24px,3.5vw,40px);border-radius:24px;border:1px solid var(--line);background:#fff}.plan h3{font-size:1.5rem;font-weight:800;letter-spacing:-.02em;color:var(--ink)}.plan-desc{margin-top:.35rem;font-size:.9688rem}.price{display:flex;align-items:baseline;gap:.4rem;margin-top:1.5rem;color:var(--ink)}.cur{align-self:flex-start;margin-top:.5rem;font-size:1.5rem;font-weight:700}.amt-num{font-size:clamp(2.75rem,5vw,3.75rem);font-weight:800;letter-spacing:-.04em;line-height:1}.per-lbl{font-size:1rem;color:var(--muted)}.plan-note{margin-top:.6rem;min-height:3.2em;font-size:.9375rem;line-height:1.5}.plan .btn{width:100%;margin-top:1.25rem}.plan-list{display:grid;gap:.75rem;margin-top:1.75rem}.plan-list li{display:flex;gap:.65rem;align-items:flex-start}.plan-list .i{margin-top:.2em;color:var(--forest)}.plan-pro{background:var(--pine);border-color:var(--pine);color:#d3e6dd}.plan-pro h3,.plan-pro .price{color:#fff}.plan-pro .per-lbl{color:#b9d3c8}.plan-pro .plan-list .i{color:var(--lime)}.fine-print{margin-top:1.5rem;text-align:center;font-size:.9rem;color:var(--muted)}@media (max-width:760px){.plans{grid-template-columns:minmax(0,1fr)}}
        .faq{display:grid;grid-template-columns:minmax(0,.7fr) minmax(0,1.3fr);gap:clamp(32px,6vw,80px)}.faq-list{border-top:1px solid var(--line)}details{border-bottom:1px solid var(--line)}summary{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1.25rem 0;font-size:1.125rem;font-weight:700;line-height:1.35;color:var(--ink);cursor:pointer;list-style:none}summary::-webkit-details-marker{display:none}summary::after{content:"";flex:none;width:16px;height:16px;background:linear-gradient(var(--forest),var(--forest)) center/100% 2px no-repeat,linear-gradient(var(--forest),var(--forest)) center/2px 100% no-repeat;transition:transform .2s}details[open] summary::after{transform:rotate(45deg)}.faq-a{max-width:42rem;padding:0 2.5rem 1.4rem 0}@media (max-width:860px){.faq{grid-template-columns:minmax(0,1fr)}}
        .final{padding-block:clamp(72px,9vw,120px);background:var(--pine);color:#d3e6dd;text-align:center}.final .h2{color:#fff;margin-inline:auto;max-width:40rem}.final p.lead{max-width:36rem;margin:1.25rem auto 0;font-size:1.1875rem}.final .btn{margin-top:2rem}.final .fine{color:#b9d3c8}.foot{padding-block:2.5rem;border-top:1px solid var(--line)}.foot-in{display:flex;flex-wrap:wrap;gap:1.5rem 2rem;justify-content:space-between;align-items:center}.foot nav{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem}.foot nav a{text-decoration:none;font-weight:500}.foot nav a:hover{color:var(--ink)}.foot small{display:block;width:100%;font-size:.875rem;color:var(--muted)}
      `}</style>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Source+Serif+4:wght@600;700&display=swap" rel="stylesheet" />
      <svg width="0" height="0" style={{position:'absolute'}} aria-hidden="true" focusable="false"><defs>
        <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></symbol>
        <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
        <symbol id="i-half" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></symbol>
        <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/></symbol>
        <symbol id="i-file" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14.5l2 2 4-4"/></symbol>
        <symbol id="i-pencil" viewBox="0 0 24 24"><path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16z"/><path d="M14 7l3 3"/></symbol>
        <symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 5h16v11h-9l-4.5 3.5V16H4z"/></symbol>
        <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 3l7.5 3v5.5c0 4.4-3.1 8-7.5 9.5-4.4-1.5-7.5-5.1-7.5-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></symbol>
        <symbol id="i-briefcase" viewBox="0 0 24 24"><rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 13h18"/></symbol>
        <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
        <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></symbol>
        <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
      </defs></svg>
      <header className="nav"><div className="wrap nav-in">
        <Link className="brand" href="/" aria-label="GetJobFit.in home">
          <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="12" width="32" height="22" rx="4" fill="#2d6a4f"/><path d="M14 12v-2a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2" fill="none" stroke="#2d6a4f" strokeWidth="3" strokeLinecap="round"/><path d="M8 24c3-3.2 5-3.2 8 0s5 3.2 8 0 5-3.2 8 0" fill="none" stroke="#c9775b" strokeWidth="2.4" strokeLinecap="round"/></svg>
          <span className="brand-word">GetJobFit<span>.in</span></span>
        </Link>
        <nav className="menu" id="menu" aria-label="Main">
          <a href="#features">Features</a><a href="#how">How it works</a><a href="#examples">Examples</a><a href="#stories">Stories</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>
          <Link className="only-m" href="/login">Sign in</Link><Link className="only-m" href="/signup">Start free</Link>
        </nav>
        <div className="nav-cta"><Link className="link" href="/login">Sign in</Link><Link className="btn btn-primary btn-sm" href="/signup">Start free</Link></div>
        <button className="nav-toggle" type="button" aria-expanded="false" aria-controls="menu" aria-label="Open menu"><svg className="i ic-menu" aria-hidden="true"><use href="#i-menu"/></svg><svg className="i ic-x" aria-hidden="true"><use href="#i-close"/></svg></button>
      </div></header>
      <main>
        <section className="hero"><div className="wrap">
          <h1 className="h1"><span className="line">Apply less.</span> <span className="line">Get called more.</span></h1>
          <p className="lede">Check your fit for any job, tailor your resume with real proof from your own career, and send only applications you can stand behind.</p>
          <div className="cta-row"><Link className="btn btn-primary btn-lg" href="/signup">Check my fit for free</Link><a className="btn btn-ghost btn-lg" href="#how">See how it works</a></div>
          <p className="fine">Free to start. No credit card needed.</p>
        </div></section>
        <section className="tour" id="features" aria-labelledby="tour-h"><h2 className="sr" id="tour-h">What GetJobFit does</h2><div className="wrap" data-tabs="">
          <div className="tabs" role="tablist" aria-label="GetJobFit features">
            <button className="tab" type="button" role="tab" id="t-fit" aria-controls="p-fit" aria-selected="true"><span className="sq sq-sage"><svg className="i" aria-hidden="true"><use href="#i-target"/></svg></span>Fit analysis</button>
            <button className="tab" type="button" role="tab" id="t-evidence" aria-controls="p-evidence" aria-selected="false" tabIndex={-1}><span className="sq sq-aqua"><svg className="i" aria-hidden="true"><use href="#i-file"/></svg></span>Evidence tracking</button>
            <button className="tab" type="button" role="tab" id="t-tailor" aria-controls="p-tailor" aria-selected="false" tabIndex={-1}><span className="sq sq-sky"><svg className="i" aria-hidden="true"><use href="#i-pencil"/></svg></span>Application tailoring</button>
            <button className="tab" type="button" role="tab" id="t-interview" aria-controls="p-interview" aria-selected="false" tabIndex={-1}><span className="sq sq-lime"><svg className="i" aria-hidden="true"><use href="#i-chat"/></svg></span>Interview preparation</button>
          </div>
          <article className="panel panel-sage" role="tabpanel" id="p-fit" aria-labelledby="t-fit">
            <div className="panel-copy"><h3 className="h3">Know your fit before you apply.</h3><p>Paste a job and we compare each requirement with your real career timeline using fixed rules, not AI guesses.</p><ul className="ticks"><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>See which requirements you already meet</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Spot your gaps before a recruiter does</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Choose jobs that are worth your time</li></ul></div>
            <div className="win"><div className="win-head"><div className="job"><span className="job-ico"><svg className="i" aria-hidden="true"><use href="#i-briefcase"/></svg></span><div><p className="win-title">Product Manager, Payments</p><p className="win-sub">Sample Fintech Ltd.</p></div></div><div className="job-tags"><span className="tag">Bengaluru, hybrid</span><span className="tag tag-lime">&#x20B9;28&#x2013;35 LPA</span></div></div><div className="win-body fit"><div className="score"><div className="ring-wrap"><svg className="ring" viewBox="0 0 100 100" aria-hidden="true"><circle className="ring-bg" cx="50" cy="50" r="44"/><circle className="ring-fg" cx="50" cy="50" r="44"/></svg><span className="ring-num"><span>78<small>%</small></span></span></div><p className="score-label">Strong fit</p><p className="score-note">Worth applying. Two gaps to prepare for.</p></div><div><p className="reqs-cap">Showing 4 of 9 requirements</p><ul className="reqs stagger"><li className="req ok"><span className="st"><svg className="i" aria-hidden="true"><use href="#i-check"/></svg></span><div><p className="req-t">5+ years in product roles</p><p className="req-d">You have 6 years 4 months</p></div></li><li className="req ok"><span className="st"><svg className="i" aria-hidden="true"><use href="#i-check"/></svg></span><div><p className="req-t">Led a cross-functional team</p><p className="req-d">Proof found in your career documents</p></div></li><li className="req part"><span className="st"><svg className="i" aria-hidden="true"><use href="#i-half"/></svg></span><div><p className="req-t">SQL and analytics</p><p className="req-d">Partial proof: one project</p></div></li><li className="req gap"><span className="st"><svg className="i" aria-hidden="true"><use href="#i-x"/></svg></span><div><p className="req-t">Payments domain</p><p className="req-d">No proof yet</p></div></li></ul></div></div><p className="win-foot">Worked out from your timeline with fixed rules. Same job, same score.</p></div>
          </article>
          <article className="panel panel-aqua" role="tabpanel" id="p-evidence" aria-labelledby="t-evidence" hidden>
            <div className="panel-copy"><h3 className="h3">Every requirement, backed by proof.</h3><p>We match each requirement to something you have really done. Where there is no proof, we tell you. We never fill the gap with something made up.</p><ul className="ticks"><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Link each achievement to your career documents</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>See exactly where your proof is missing</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Add missing proof whenever you have it</li></ul></div>
            <div className="win"><div className="win-head"><div><p className="win-title">Evidence map</p><p className="win-sub">Each requirement, linked to your proof</p></div></div><div className="win-body evid stagger"><div className="pair"><p className="pair-req">Led a cross-functional team</p><span className="pair-link" aria-hidden="true"><svg className="i"><use href="#i-arrow"/></svg></span><div className="pair-ev"><p className="ev-t">Led a 6-member growth team across product, design and data</p><p className="ev-src"><svg className="i" aria-hidden="true"><use href="#i-file"/></svg>Performance review, FY 2023&#x2013;24</p></div></div><div className="pair"><p className="pair-req">Improved a key product metric</p><span className="pair-link" aria-hidden="true"><svg className="i"><use href="#i-arrow"/></svg></span><div className="pair-ev"><p className="ev-t">Raised sign-up to activation from 31% to 49% in two quarters</p><p className="ev-src"><svg className="i" aria-hidden="true"><use href="#i-file"/></svg>Analytics export, March 2024</p></div></div><div className="pair gap"><p className="pair-req">Payments domain</p><span className="pair-link" aria-hidden="true"><svg className="i"><use href="#i-arrow"/></svg></span><div className="pair-ev"><p className="ev-t">No proof yet</p><p className="ev-src">Add a real example, or leave this out. We won&#x2019;t make one up.</p></div></div></div><p className="win-foot">Your proof lives in your career documents.</p></div>
          </article>
          <article className="panel panel-sky" role="tabpanel" id="p-tailor" aria-labelledby="t-tailor" hidden>
            <div className="panel-copy"><h3 className="h3">A tailored resume that stays true.</h3><p>Adjust your resume and cover letter for each role. Truth Guard checks every line and blocks anything you can&#x2019;t back up.</p><ul className="ticks"><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>One resume, shaped for every job</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>A cover letter that matches the role</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>No claim goes out without proof</li></ul></div>
            <div className="win"><div className="win-head"><div><p className="win-title">Resume for Product Manager, Payments</p><p className="win-sub">Truth Guard is checking each line</p></div></div><div className="win-body lines stagger"><div className="line-item"><span className="badge"><svg className="i" aria-hidden="true"><use href="#i-check"/></svg></span><p>Led a 6-member growth team across product, design and data.</p><span className="chip">Backed by proof</span></div><div className="line-item"><span className="badge"><svg className="i" aria-hidden="true"><use href="#i-check"/></svg></span><p>Raised sign-up to activation from 31% to 49% in two quarters.</p><span className="chip">Backed by proof</span></div><div className="line-item block"><span className="badge"><svg className="i" aria-hidden="true"><use href="#i-x"/></svg></span><div><p>Managed a &#x20B9;50 Cr payments budget.</p><p className="block-note"><strong>Blocked by Truth Guard.</strong> No proof for this in your career documents.</p><div className="row-actions"><span className="mini">Add proof</span><span className="mini mini-ghost">Remove line</span></div></div></div></div></div>
          </article>
          <article className="panel panel-lime" role="tabpanel" id="p-interview" aria-labelledby="t-interview" hidden>
            <div className="panel-copy"><h3 className="h3">Walk into the interview ready.</h3><p>Get clear talking points built from your own strengths and gaps. Know your best stories, and how to speak honestly about what you haven&#x2019;t done yet.</p><ul className="ticks"><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Your strongest stories, ready to tell</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>An honest way to answer questions about gaps</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Talking points for every application</li></ul></div>
            <div className="win"><div className="win-head"><div><p className="win-title">Talking points for this interview</p><p className="win-sub">Built from your strengths and gaps</p></div></div><div className="win-body talk stagger"><div className="talk-item"><span className="pill">Strength</span><h4>Your growth-team story</h4><p>Activation was flat. You led six people to rebuild onboarding. The result: 31% to 49%.</p></div><div className="talk-item"><span className="pill">Strength</span><h4>Leading across teams</h4><p>Use the same story to show you can lead across product, design and data.</p></div><div className="talk-item gap"><span className="pill pill-gap">Gap</span><h4>Payments experience</h4><p>Say it plainly: you haven&#x2019;t worked in payments yet. Then point to the checkout flows you have owned.</p></div></div></div>
          </article>
        </div></section>
        <section className="promises" aria-labelledby="promises-h"><h2 className="sr" id="promises-h">Our promises</h2><div className="wrap promises-in">
          <div className="promise"><span className="sq sq-sage"><svg className="i" aria-hidden="true"><use href="#i-target"/></svg></span><div><h3>Scores from rules, not guesses</h3><p>Same job, same score. Every time.</p></div></div>
          <div className="promise"><span className="sq sq-aqua"><svg className="i" aria-hidden="true"><use href="#i-file"/></svg></span><div><h3>Proof behind every line</h3><p>Each requirement links to something you have done.</p></div></div>
          <div className="promise"><span className="sq sq-lime"><svg className="i" aria-hidden="true"><use href="#i-shield"/></svg></span><div><h3>Truth Guard on every draft</h3><p>Nothing goes out that you can&#x2019;t back up.</p></div></div>
        </div></section>
        <section className="section bg-white" id="why"><div className="wrap split">
          <div><h2 className="h2">More applications won&#x2019;t fix a weak match.</h2><p className="lede-sm">Sending one resume to a hundred jobs feels busy. It rarely works. A recruiter wants to see a clear match, and a generic resume doesn&#x2019;t show one.</p><p className="closing">Fewer applications. Better matches. More calls.</p></div>
          <table className="compare"><caption className="sr">Usual way vs GetJobFit</caption>
            <thead><tr><th scope="col"><span className="sr">What you do</span></th><th scope="col">The usual way</th><th scope="col">With GetJobFit</th></tr></thead>
            <tbody>
              <tr><th scope="row">Your resume</th><td data-label="The usual way"><span className="cell"><svg className="i no" aria-hidden="true"><use href="#i-x"/></svg>The same one for every job</span></td><td data-label="With GetJobFit"><span className="cell"><svg className="i yes" aria-hidden="true"><use href="#i-check"/></svg>Tailored to each role</span></td></tr>
              <tr><th scope="row">Your fit</th><td data-label="The usual way"><span className="cell"><svg className="i no" aria-hidden="true"><use href="#i-x"/></svg>A guess</span></td><td data-label="With GetJobFit"><span className="cell"><svg className="i yes" aria-hidden="true"><use href="#i-check"/></svg>A clear score before you apply</span></td></tr>
              <tr><th scope="row">Your claims</th><td data-label="The usual way"><span className="cell"><svg className="i no" aria-hidden="true"><use href="#i-x"/></svg>Stretched to sound big</span></td><td data-label="With GetJobFit"><span className="cell"><svg className="i yes" aria-hidden="true"><use href="#i-check"/></svg>Each one backed by proof</span></td></tr>
              <tr><th scope="row">Applications sent</th><td data-label="The usual way"><span className="cell"><svg className="i no" aria-hidden="true"><use href="#i-x"/></svg>As many as you can</span></td><td data-label="With GetJobFit"><span className="cell"><svg className="i yes" aria-hidden="true"><use href="#i-check"/></svg>Only the ones worth sending</span></td></tr>
              <tr><th scope="row">After you apply</th><td data-label="The usual way"><span className="cell"><svg className="i no" aria-hidden="true"><use href="#i-x"/></svg>Waiting and hoping</span></td><td data-label="With GetJobFit"><span className="cell"><svg className="i yes" aria-hidden="true"><use href="#i-check"/></svg>Ready for the interview</span></td></tr>
            </tbody>
          </table>
        </div></section>
        <section className="section" id="how"><div className="wrap">
          <h2 className="h2 center">From job post to confident application in five steps.</h2>
          <ol className="steps">
            <li className="step"><span className="step-n" aria-hidden="true">1</span><h3>Job</h3><p>Paste the job description. We pull out what the employer really asks for.</p></li>
            <li className="step"><span className="step-n" aria-hidden="true">2</span><h3>Fit</h3><p>See a clear fit score, worked out from your real timeline.</p></li>
            <li className="step"><span className="step-n" aria-hidden="true">3</span><h3>Evidence</h3><p>Every requirement is matched to something you have done. Gaps are shown, never hidden.</p></li>
            <li className="step"><span className="step-n" aria-hidden="true">4</span><h3>Tailor</h3><p>Your resume and cover letter are shaped for the role. Truth Guard blocks any line you can&#x2019;t prove.</p></li>
            <li className="step"><span className="step-n" aria-hidden="true">5</span><h3>Apply</h3><p>Send with confidence, and walk into the interview with talking points ready.</p></li>
          </ol>
          <div className="cta-row"><Link className="btn btn-primary btn-lg" href="/signup">Check my fit for free</Link></div>
        </div></section>
        <section className="section bg-white" id="examples"><div className="wrap">
          <div className="ex-head"><h2 className="h2">A claim is easy. Proof gets you the call.</h2><p className="lede-sm">See how a vague line becomes one a recruiter can believe. Every number comes from you, never from us.</p></div>
          <div className="ex" data-tabs="">
            <div>
              <div className="role-tabs" role="tablist" aria-label="Choose a role" aria-orientation="vertical">
                <button className="role" type="button" role="tab" id="x-fresher" aria-controls="ex-fresher" aria-selected="true">Fresher</button>
                <button className="role" type="button" role="tab" id="x-sales" aria-controls="ex-sales" aria-selected="false" tabIndex={-1}>Sales</button>
                <button className="role" type="button" role="tab" id="x-software" aria-controls="ex-software" aria-selected="false" tabIndex={-1}>Software</button>
                <button className="role" type="button" role="tab" id="x-ops" aria-controls="ex-ops" aria-selected="false" tabIndex={-1}>Operations</button>
                <button className="role" type="button" role="tab" id="x-marketing" aria-controls="ex-marketing" aria-selected="false" tabIndex={-1}>Marketing</button>
              </div>
              <p className="ex-cap">Illustrative examples. Your numbers will come from your own records.</p>
            </div>
            <div>
              <div className="ba-wrap" role="tabpanel" id="ex-fresher" aria-labelledby="x-fresher"><div className="ba before"><p className="ba-label">Before</p><p className="ba-text">Did an internship and worked on a few projects.</p></div><div className="ba after"><p className="ba-label">After</p><p className="ba-text">Built an Excel tracker for a 120-member college club. It saved the team about 5 hours a week.</p><p className="ba-src"><svg className="i" aria-hidden="true"><use href="#i-file"/></svg>Backed by: club handover report, March 2026</p></div></div>
              <div className="ba-wrap" role="tabpanel" id="ex-sales" aria-labelledby="x-sales" hidden><div className="ba before"><p className="ba-label">Before</p><p className="ba-text">Responsible for B2B sales and client handling.</p></div><div className="ba after"><p className="ba-label">After</p><p className="ba-text">Closed &#x20B9;1.8 Cr in new B2B revenue across 22 accounts in FY 2025&#x2013;26, 12% above target.</p><p className="ba-src"><svg className="i" aria-hidden="true"><use href="#i-file"/></svg>Backed by: sales report, FY 2025&#x2013;26</p></div></div>
              <div className="ba-wrap" role="tabpanel" id="ex-software" aria-labelledby="x-software" hidden><div className="ba before"><p className="ba-label">Before</p><p className="ba-text">Worked on backend APIs and improved performance.</p></div><div className="ba after"><p className="ba-label">After</p><p className="ba-text">Cut checkout API response time from 820 ms to 310 ms for an app with 2.4 lakh monthly users.</p><p className="ba-src"><svg className="i" aria-hidden="true"><use href="#i-file"/></svg>Backed by: performance dashboard export, January 2026</p></div></div>
              <div className="ba-wrap" role="tabpanel" id="ex-ops" aria-labelledby="x-ops" hidden><div className="ba before"><p className="ba-label">Before</p><p className="ba-text">Managed vendor payments and coordination.</p></div><div className="ba after"><p className="ba-label">After</p><p className="ba-text">Managed &#x20B9;14 Cr in yearly vendor payments and cut payment delays by 30% in two quarters.</p><p className="ba-src"><svg className="i" aria-hidden="true"><use href="#i-file"/></svg>Backed by: finance dashboard, Q3 and Q4 of FY 2025&#x2013;26</p></div></div>
              <div className="ba-wrap" role="tabpanel" id="ex-marketing" aria-labelledby="x-marketing" hidden><div className="ba before"><p className="ba-label">Before</p><p className="ba-text">Handled social media and campaigns.</p></div><div className="ba after"><p className="ba-label">After</p><p className="ba-text">Ran 6 campaigns on a &#x20B9;9 lakh quarterly budget and cut cost per lead from &#x20B9;410 to &#x20B9;265.</p><p className="ba-src"><svg className="i" aria-hidden="true"><use href="#i-file"/></svg>Backed by: ads report, April to June 2026</p></div></div>
              <p className="note"><svg className="i" aria-hidden="true"><use href="#i-shield"/></svg><span>No number to add? We will ask you for one, or keep the line simple. We never make one up.</span></p>
            </div>
          </div>
        </div></section>
        <section className="section" id="stories"><div className="wrap">
          <h2 className="h2">Job seekers who stopped guessing.</h2>
          <p className="lede-sm">See what changes when every application is matched, proven and honest.</p>
          <p className="todo">Sample stories. Replace with real reviews before launch.</p>
          <div className="quotes">
            <figure className="quote"><blockquote><p>&#x201C;I used to send 40 applications a week and hear nothing. The fit score helped me pick eight roles that truly matched me. Three replied within two weeks.&#x201D;</p></blockquote><span className="result">8 applications, 3 replies</span><figcaption className="who"><span className="av" aria-hidden="true">PM</span><span><span className="who-n">Priya Menon</span><br/><span className="who-r">Product Analyst, Bengaluru</span></span></figcaption></figure>
            <figure className="quote t-aqua"><blockquote><p>&#x201C;My old resume said &#x2018;handled key accounts&#x2019;. Now it says &#x20B9;2.1 Cr closed, and every number links to a report I uploaded. Recruiters now ask about the numbers, not whether they&#x2019;re real.&#x201D;</p></blockquote><span className="result">&#x20B9;14 LPA to &#x20B9;19 LPA</span><figcaption className="who"><span className="av" aria-hidden="true">RD</span><span><span className="who-n">Rahul Deshmukh</span><br/><span className="who-r">Sales Manager, Pune</span></span></figcaption></figure>
            <figure className="quote"><blockquote><p>&#x201C;Truth Guard stopped me from adding a tool I had used only once. Then an interviewer dug into my projects, and I had an answer for everything.&#x201D;</p></blockquote><span className="result">Offer in six weeks</span><figcaption className="who"><span className="av" aria-hidden="true">AR</span><span><span className="who-n">Ananya Rao</span><br/><span className="who-r">Data Analyst, Hyderabad</span></span></figcaption></figure>
            <figure className="quote t-lime"><blockquote><p>&#x201C;I stopped applying everywhere. Fewer applications, better replies, and far less stress. It felt like someone finally showed me which jobs were worth my evenings.&#x201D;</p></blockquote><span className="result">12 applications, 5 calls</span><figcaption className="who"><span className="av" aria-hidden="true">SK</span><span><span className="who-n">Sneha Kulkarni</span><br/><span className="who-r">Marketing Manager, Delhi NCR</span></span></figcaption></figure>
            <figure className="quote"><blockquote><p>&#x201C;The gap notes told me exactly what to say about a skill I didn&#x2019;t have. I stayed calm, stayed honest, and still got the offer.&#x201D;</p></blockquote><span className="result">Offer after 3 rounds</span><figcaption className="who"><span className="av" aria-hidden="true">MS</span><span><span className="who-n">Mohammed Sheikh</span><br/><span className="who-r">Operations Lead, Mumbai</span></span></figcaption></figure>
            <figure className="quote"><blockquote><p>&#x201C;The evidence map kept my facts steady while the tailoring adjusted the story for each role.&#x201D;</p></blockquote><span className="result">Applied in India and the UAE</span><figcaption className="who"><span className="av" aria-hidden="true">KI</span><span><span className="who-n">Karthik Iyer</span><br/><span className="who-r">Software Engineer, Dubai</span></span></figcaption></figure>
          </div>
        </div></section>
        <section className="section bg-white" id="pricing"><div className="wrap">
          <div className="center">
            <h2 className="h2 center">Simple, honest pricing.</h2>
            <p className="lede-sm center">Start free. Pay only when you are ready to apply seriously.</p>
            <p className="todo">Sample prices. Set your final prices before you launch.</p>
            <div><div className="bill" role="group" aria-label="Billing period">
              <button type="button" data-plan="weekly" aria-pressed="false">Weekly</button>
              <button type="button" data-plan="monthly" aria-pressed="true">Monthly</button>
              <button type="button" data-plan="yearly" aria-pressed="false">Yearly</button>
            </div></div>
          </div>
          <div className="plans">
            <article className="plan"><h3>Free</h3><p className="plan-desc">Try GetJobFit on your first job.</p><p className="price"><span id="free-cur" className="cur">$</span><span className="amt-num">0</span><span className="per-lbl">to start</span></p><p className="plan-note">No credit card needed.</p><Link className="btn btn-ghost" href="/signup">Start free</Link><ul className="plan-list"><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Build your career documents</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Check your fit for a job</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>See your evidence map</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Preview a tailored resume</li></ul></article>
            <article className="plan plan-pro"><h3>Pro</h3><p className="plan-desc">For a serious job hunt.</p><p className="price" aria-live="polite"><span id="cur" className="cur">$</span><span className="amt-num" id="amt">9</span><span className="per-lbl" id="per">per month</span></p><p className="plan-note" id="pnote">Good for a steady job search.</p><Link className="btn btn-light" href="/signup">Get Pro</Link><ul className="plan-list"><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Everything in Free</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Unlimited fit checks</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Tailored resumes and cover letters for every role</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Truth Guard on every draft</li><li><svg className="i" aria-hidden="true"><use href="#i-check"/></svg>Interview preparation for each application</li></ul></article>
          </div>
          <p className="fine-print" id="fine-print">All prices are in USD. Taxes may be added where applicable.</p>
        </div></section>
        <section className="section" id="faq"><div className="wrap faq">
          <div><h2 className="h2">Questions, answered plainly.</h2></div>
          <div className="faq-list">
            <details><summary>How is my fit score calculated?</summary><p className="faq-a">We compare each job requirement against your actual career history using fixed, deterministic rules — no AI guesswork in the score itself. If you have a skill, a metric, or a dated achievement that matches, it counts. If you don’t, it shows as a gap. The score is code, not a vibe check.</p></details>
            <details><summary>Will GetJobFit make things up for me?</summary><p className="faq-a">No, and that’s the point. Our Truth Guard system checks every suggested line against your own uploaded career documents. If a claim has no proof behind it, we block it and explain why. You can only send what you can actually back up.</p></details>
            <details><summary>What if I’m missing some requirements?</summary><p className="faq-a">Most people are, and that’s fine. We show your gaps clearly and early — before you write a word — so you can decide whether a role is worth pursuing. If you do apply, we help you address gaps honestly instead of hiding them.</p></details>
            <details><summary>What do I need to get started?</summary><p className="faq-a">Just your work history and a job post. Paste your resume text or upload a PDF, paste the job description, and you’ll have a fit score in under a minute. Add proof documents like offer letters or performance reviews as you go.</p></details>
            <details><summary>Can I use it for jobs outside India?</summary><p className="faq-a">Yes. You can check your fit against any job post worldwide, in any language. The scoring and tailoring work the same regardless of where the role is based.</p></details>
            <details><summary>How does the pricing work?</summary><p className="faq-a">Free to start — no credit card needed. You get one full fit analysis, your evidence map, and a tailored resume preview. Upgrade to Pro for unlimited fit checks, full tailored resumes, cover letters, and interview prep for every role. Prices are shown in your local currency automatically.</p></details>
            <details><summary>Can I cancel anytime?</summary><p className="faq-a">Yes. No long-term contracts. Cancel from your account settings and you keep Pro access until the end of your billing period. No questions asked.</p></details>
            <details><summary>Is my data safe?</summary><p className="faq-a">Your resume and career documents are stored encrypted and are never shared or used to train AI models. We only use your data to power your own analysis. You can delete your account and all associated data at any time from settings.</p></details>
          </div>
        </div></section>
        <section className="final"><div className="wrap">
          <h2 className="h2">Ready to apply less and get called more?</h2>
          <p className="lead">Start with the job you are eyeing right now. See your fit before you send a single line.</p>
          <Link className="btn btn-light btn-lg" href="/signup">Check my fit for free</Link>
          <p className="fine">Free to start. No credit card needed.</p>
        </div></section>
      </main>
      <footer className="foot"><div className="wrap foot-in">
        <Link className="brand" href="/" aria-label="GetJobFit.in home">
          <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><rect x="4" y="12" width="32" height="22" rx="4" fill="#2d6a4f"/><path d="M14 12v-2a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v2" fill="none" stroke="#2d6a4f" strokeWidth="3" strokeLinecap="round"/><path d="M8 24c3-3.2 5-3.2 8 0s5 3.2 8 0 5-3.2 8 0" fill="none" stroke="#c9775b" strokeWidth="2.4" strokeLinecap="round"/></svg>
          <span className="brand-word">GetJobFit<span>.in</span></span>
        </Link>
        <nav aria-label="Footer"><a href="#features">Features</a><a href="#how">How it works</a><a href="#examples">Examples</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
        <small>&#x00A9; <span id="yr">2026</span> GetJobFit.in. Apply less. Get called more.</small>
      </div></footer>
    </>
  );
}
