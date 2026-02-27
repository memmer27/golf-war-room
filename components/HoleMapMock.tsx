export default function HoleMapMock() {
  const holes = Array.from({ length: 18 }, (_, i) => i + 1);
  return (
    <div className="grid18">
      {holes.map(h => (
        <div key={h} className="hole">
          <div className="holeNum">{h}</div>
          <div className="small">% strokes: —</div>
          <div className="small">Birdie: — | Bogey: —</div>
        </div>
      ))}
    </div>
  );
}
