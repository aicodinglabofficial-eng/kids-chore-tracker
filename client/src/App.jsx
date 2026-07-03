import { useEffect, useState } from "react";
import { api } from "./api.js";
import ProfilePicker from "./components/ProfilePicker.jsx";
import KidDashboard from "./components/KidDashboard.jsx";
import ParentZone from "./components/ParentZone.jsx";
import ParentGate from "./components/ParentGate.jsx";

function App() {
  const [kids, setKids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeKidId, setActiveKidId] = useState(null);
  const [showParentGate, setShowParentGate] = useState(false);
  const [showParentZone, setShowParentZone] = useState(false);

  useEffect(() => {
    api.getKids().then((data) => {
      setKids(data);
      setLoading(false);
    });
  }, []);

  async function addKid(data) {
    const kid = await api.addKid(data);
    setKids((prev) => [...prev, kid]);
  }

  function updateKidStars(kidId, stars) {
    setKids((prev) => prev.map((k) => (k.id === kidId ? { ...k, stars } : k)));
  }

  const activeKid = kids.find((k) => k.id === activeKidId);

  if (loading) {
    return <div className="screen loading-screen">Loading the fun... 🌈</div>;
  }

  if (showParentZone) {
    return (
      <ParentZone
        kids={kids}
        onBack={() => setShowParentZone(false)}
        onKidsChanged={setKids}
      />
    );
  }

  if (activeKid) {
    return (
      <KidDashboard
        kid={activeKid}
        onBack={() => setActiveKidId(null)}
        onKidUpdated={updateKidStars}
      />
    );
  }

  return (
    <>
      <ProfilePicker
        kids={kids}
        onSelect={(kid) => setActiveKidId(kid.id)}
        onAddKid={addKid}
        onOpenParentZone={() => setShowParentGate(true)}
      />
      {showParentGate && (
        <ParentGate
          onSuccess={() => {
            setShowParentGate(false);
            setShowParentZone(true);
          }}
          onCancel={() => setShowParentGate(false)}
        />
      )}
    </>
  );
}

export default App;
