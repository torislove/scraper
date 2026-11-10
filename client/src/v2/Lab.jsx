import React, { useState } from 'react';
import {
  Button3D, Card3D, StatTile, Segmented3D, SignalOrb, Hint, Tip, OrbitalRadar, Shelf3D,
} from '@ui3d';
import InstrumentPanel from './components/InstrumentPanel';

/* Dev-only gallery. Never linked from the product, never shipped in a build.
   It exists so every surface can be inspected in every state without hunting
   through a 200 KB dashboard file. */

const FLOATS = [
  { value: '1,284', label: 'leads verified', left: '0%', top: '14%' },
  { value: '92 sec', label: 'Guntur district', left: '66%', top: '20%' },
  { value: '100%', label: 'mobiles validated', left: '60%', top: '72%' },
];

export default function Lab() {
  const [scope, setScope] = useState('city');
  const [leads, setLeads] = useState(1284);
  const [busy, setBusy] = useState(false);
  const [demoLeads, setDemoLeads] = useState(0);

  const runDemo = () => {
    setBusy(true);
    setTimeout(() => {
      setLeads((n) => n + 250);
      setBusy(false);
    }, 900);
  };

  return (
    <div className="k3-lab">
      <div className="k3-lab__wrap">
        <header className="k3-lab__head">
          <div className="k3-lab__row">
            <SignalOrb size={40} live tone="#5eead4" title="Kit online" />
            <span className="k3-badge k3-badge--live">DEV ONLY</span>
            <span className="k3-badge k3-badge--brass">PHASE 1</span>
          </div>
          <h1>The physical kit</h1>
          <p>
            Every surface below is real: one key light from the top-left, a contact shadow, a
            body shadow and an ambient bloom. Drag the radar — it has inertia. Press the brass
            button — it sparks. Nothing here loads an image or calls the network.
          </p>
        </header>

        <section>
          <div className="k3-lab__label">Buttons — bevel, specular, press detent</div>
          <div className="k3-lab__row">
            <Button3D variant="brass">Start finding leads</Button3D>
            <Button3D variant="glass">Secondary action</Button3D>
            <Button3D variant="ghost">Quiet action</Button3D>
            <Button3D variant="danger">Stop</Button3D>
            <Button3D variant="brass" size="sm">Small brass</Button3D>
            <Button3D variant="glass" size="lg">Large glass</Button3D>
          </div>
          <div className="k3-lab__row" style={{ marginTop: 14 }}>
            <Button3D variant="glass" loading>Working…</Button3D>
            <Button3D variant="brass" disabled>Disabled</Button3D>
            <Tip text="Opens the search console. Nothing is charged until a search actually runs.">
              <Button3D variant="ghost">Hover me for a tooltip</Button3D>
            </Tip>
          </div>
        </section>

        <section>
          <div className="k3-lab__label">Radar — drag to spin, inertial release</div>
          <div className="k3-lab__radar">
            <OrbitalRadar size={460} pins={20} floats={FLOATS} hint="Drag to spin · release to coast" />
            <span className="k3-lab__note">Pure CSS 3D. No WebGL, no textures, no canvas.</span>
          </div>
        </section>

        <section>
          <div className="k3-lab__label">Cards — pointer tilt with parallax</div>
          <div className="k3-lab__grid">
            <Card3D interactive glow="rgba(94,234,212,0.22)" style={{ padding: 20 }}>
              <span className="k3-badge k3-badge--live" style={{ marginBottom: 12 }}>MANDAL SCOPE</span>
              <h3 style={{ margin: '8px 0 6px', fontSize: 17 }}>Tenali Mandal</h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--k3-text-2)' }}>
                10 revenue units. About 4 minutes. Every shop, every mobile that validates.
              </p>
            </Card3D>

            <Card3D interactive tilt={8} glow="rgba(240,194,116,0.20)" style={{ padding: 20 }}>
              <span className="k3-badge k3-badge--brass" style={{ marginBottom: 12 }}>DISTRICT SCOPE</span>
              <h3 style={{ margin: '8px 0 6px', fontSize: 17 }}>Guntur district</h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--k3-text-2)' }}>
                19 sub-districts, HQ included. Roughly 11 minutes end to end.
              </p>
            </Card3D>

            <Card3D material="ceramic" style={{ padding: 20 }}>
              <span style={{ fontSize: 11, letterSpacing: '0.14em', color: '#64748b' }}>CERAMIC</span>
              <h3 style={{ margin: '8px 0 6px', fontSize: 17 }}>Clean surface</h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#475569' }}>
                Used for pricing and product panels on the marketing page.
              </p>
            </Card3D>
          </div>
        </section>

        <section>
          <div className="k3-lab__label">Numbers — count up, never reflow</div>
          <div className="k3-lab__grid">
            <Shelf3D>
              <StatTile label="Leads found" value={leads} hint="Every row is one credit. Invalid mobiles are dropped, not charged." tone="#5eead4" />
              <div style={{ marginTop: 14 }}>
                <Button3D variant="brass" size="sm" loading={busy} onClick={runDemo}>
                  Find 250 more
                </Button3D>
              </div>
            </Shelf3D>

            <Shelf3D>
              <StatTile label="Area covered" value={10.1} decimals={1} suffix="km" hint="Farthest verified lead from the searched centre." tone="#7dd3fc" />
            </Shelf3D>

            <Shelf3D>
              <StatTile label="Mobile hit rate" value={88} suffix="%" hint="Share of rows with a validated 10-digit Indian mobile." tone="#f0c274" />
            </Shelf3D>
          </div>
        </section>

        <section>
          <div className="k3-lab__label">Scope picker — sliding thumb</div>
          <div className="k3-lab__row">
            <Segmented3D
              label="Search scope"
              value={scope}
              onChange={setScope}
              items={[
                { id: 'city', label: 'City / town' },
                { id: 'mandal', label: 'Mandal' },
                { id: 'district', label: 'District' },
              ]}
            />
            <Hint>
              {scope === 'city' && 'One city, town or village. Includes a 5 km ring around it.'}
              {scope === 'mandal' && 'Every revenue village and ward inside the mandal.'}
              {scope === 'district' && 'The district HQ plus every sub-district HQ.'}
            </Hint>
          </div>
        </section>

        <section>
          <div className="k3-lab__label">Explanatory layer</div>
          <div className="k3-lab__grid">
            <Shelf3D>
              <Hint tone="brass">
                <b>Why this matters:</b> a lead is only counted once the mobile passes the
                Indian phone parser. Landlines go to the secondary column.
              </Hint>
            </Shelf3D>
            <Shelf3D>
              <Hint>
                <b>Repeat searches:</b> leads verified earlier in the same area are carried
                forward automatically. You are not charged twice.
              </Hint>
            </Shelf3D>
          </div>
        </section>
        <section>
          <div className="k3-lab__label">Flight instruments — Phase 5 live deck</div>
          <div className="k3-lab__row" style={{ marginBottom: 12 }}>
            <Button3D variant="glass" size="sm" onClick={() => setDemoLeads(n => n + 12)}>
              Simulate 12 leads
            </Button3D>
            <Button3D variant="ghost" size="sm" onClick={() => setDemoLeads(0)}>Reset</Button3D>
            <Hint tone="brass">The panel polls the engine; with no run live the board shows the last session.</Hint>
          </div>
          <InstrumentPanel
            running
            leadCount={demoLeads}
            progress={{ eta: '34s', coverageMode: 'fast' }}
          />
        </section>
      </div>
    </div>
  );
}
