import LinesPastePanel from '@/components/LinesPastePanel';
import AvailableMarkets from '@/components/AvailableMarkets';
import HoleMapMock from '@/components/HoleMapMock';

export default function Page() {
  return (
    <div className="container">
      <div className="row" style={{alignItems:'baseline', justifyContent:'space-between'}}>
        <div>
          <h1 style={{margin:'0 0 6px'}}>Golf War Room</h1>
          <div className="small">Hosted Next.js starter: event dropdown + lines paste/parse + available markets + hole-map placeholder.</div>
        </div>
        <div className="card" style={{minWidth:320}}>
          <div className="label">Event (v1)</div>
          <select className="input" defaultValue="cognizant">
            <option value="cognizant">Cognizant Classic (example)</option>
          </select>
          <div className="label">Round</div>
          <select className="input" defaultValue="2">
            <option value="1">RD1</option>
            <option value="2">RD2</option>
            <option value="3">RD3</option>
            <option value="4">RD4</option>
          </select>
          <div className="small" style={{marginTop:10}}>Hook these to real DG event_id/year once backend refresh is wired.</div>
        </div>
      </div>

      <div style={{marginTop:16}}>
        <AvailableMarkets />
      </div>

      <div className="row" style={{marginTop:16}}>
        <div className="card" style={{flex:1, minWidth:520}}>
          <h2 style={{marginTop:0}}>Paste PrizePicks Lines</h2>
          <div className="small">Paste one market at a time (Strokes, BoB, Fairways, GIR, Pars, Matchups). We parse into a clean table.</div>
          <LinesPastePanel />
        </div>
        <div className="card" style={{flex:1, minWidth:520}}>
          <h2 style={{marginTop:0}}>Hole Map (placeholder)</h2>
          <div className="small">In v1 this will be powered by cached historical event/hole stats. For now it shows the 18-hole grid UI.</div>
          <HoleMapMock />
        </div>
      </div>
    </div>
  );
}
