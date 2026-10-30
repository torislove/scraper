import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Zap, Search, Compass, Award, Navigation, Database, Radio } from 'lucide-react';
import Mascot3D from './Mascot3D';
import './screenMascot.css';

const WAYPOINTS = {
  patrol: { id: 'patrol', name: 'Edge Patrol', x: null, y: 84, mode: 'walking', label: 'MASTER SCOUT PATROL' },
  search: { id: 'search', name: 'Search Omnibox', x: 58, y: 13, mode: 'fly', label: 'PERCHED: MASTER CONSOLE' },
  leads:  { id: 'leads',  name: 'Leads Stream',    x: 28, y: 44, mode: 'dig', label: 'MINING LIVE LEADS' },
  radar:  { id: 'radar',  name: 'Telemetry Radar', x: 82, y: 40, mode: 'fly', label: 'TERRITORIAL RADAR MESH' },
  vault:  { id: 'vault',  name: 'Universal Vault', x: 18, y: 26, mode: 'dance', label: 'UNIVERSAL VAULT LOADED' },
  map:    { id: 'map',    name: 'Excavation Grid', x: 48, y: 56, mode: 'dig', label: 'MASTER EXCAVATOR DIVE' }
};

const FUNNY_MESSAGES_MASTER = [
  "👑 MASTER COMMAND CENTER ACTIVE! Sweeping districts & states!",
  "🛰️ Territorial 5-Vector mesh locked on multiple mandals!",
  "💎 Universal Vault connected across all 23+ client workspaces!",
  "⚡ Jetpack thrusters at maximum overdrive! 35+ leads/second!",
  "🗺️ Aggregating verified +91 telecom lines state-wide!",
  "🔥 Golden pickaxe striking deep into municipal databases!"
];

const MASTER_RECOMMENDATIONS = [
  {
    speech: "Master Swarm ready! Pick a territory to run an enterprise sweep:",
    chips: [
      { label: "📸 Photographers (Krishna Dist)", query: "wedding photographers in krishna district" },
      { label: "🍽️ Caterers (Andhra Pradesh)", query: "catering services in andhra pradesh with whatsapp" }
    ]
  },
  {
    speech: "High-yield commercial categories detected across state mesh:",
    chips: [
      { label: "🏗️ Building Material Suppliers", query: "building material suppliers in telangana" },
      { label: "🏭 Industrial Equipment Dealers", query: "industrial equipment suppliers in hyderabad" }
    ]
  },
  {
    speech: "Ready to mine verified B2B lines with WhatsApp direct:",
    chips: [
      { label: "⚡ Electrical Contractors", query: "electrical contractors in vijayawada and guntur" },
      { label: "🚚 Logistics & Transporters", query: "logistics transport services in visakhapatnam" }
    ]
  }
];

export default function ScreenMascotCompanion({
  scraping = false,
  activeZone = '',
  leadsFound = 0,
  onOpenVault = null,
  onTriggerSearch = null
}) {
  const [currentWaypoint, setCurrentWaypoint] = useState('patrol');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [posX, setPosX] = useState(82);
  const [posY, setPosY] = useState(84);
  const [direction, setDirection] = useState(1);
  const [actionState, setActionState] = useState('walking');
  const [speech, setSpeech] = useState("Master Command Scout reporting for duty! 👑");
  const [actionChips, setActionChips] = useState([
    { label: "📸 Krishna District Sweep", query: "wedding photographers in krishna district" },
    { label: "🍽️ Andhra State Catering", query: "catering services in andhra pradesh with whatsapp" }
  ]);
  const [showFlightMenu, setShowFlightMenu] = useState(false);
  const [showSpeech, setShowSpeech] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Dynamic Inversion: If Diggy is in upper 35% of the viewport, flip bubble below him!
  const isInverted = posY < 35;

  // Flight transition to any UI Waypoint
  const flyToWaypoint = useCallback((wpKey, customSpeech = null, targetAction = null) => {
    const wp = WAYPOINTS[wpKey];
    if (!wp) return;

    setIsTransitioning(true);
    setActionState('sprint');
    setCurrentWaypoint(wpKey);

    if (customSpeech) {
      setSpeech(customSpeech);
      setShowSpeech(true);
    }

    const targetX = wp.x !== null ? wp.x : posX;
    const targetY = wp.y;

    if (targetX > posX) setDirection(1);
    else if (targetX < posX) setDirection(-1);

    setPosX(targetX);
    setPosY(targetY);

    const arrivalTimer = setTimeout(() => {
      setIsTransitioning(false);
      setActionState(targetAction || (wpKey === 'patrol' ? 'walking' : wp.mode));
    }, 850);

    return () => clearTimeout(arrivalTimer);
  }, [posX]);

  // Trigger search on Master
  const handleTriggerSearch = (query) => {
    setActionChips([]);
    setSpeech(`👑 Master Swarm launching for "${query}"!`);
    setActionState('sprint');
    setShowSpeech(true);

    if (typeof onTriggerSearch === 'function') {
      onTriggerSearch(query);
    } else {
      window.dispatchEvent(new CustomEvent('leadharvest:search', { detail: { query } }));
    }

    setTimeout(() => {
      setActionState('dig');
    }, 1800);
  };

  const prevScrapingRef = useRef(scraping);

  useEffect(() => {
    if (scraping) {
      flyToWaypoint('leads', `⛏️ MASTER TERRITORIAL SWEEP IN PROGRESS: ${activeZone ? activeZone.toUpperCase() : 'ALL ZONES'}!`, 'dig');
      setActionChips([]);
      setShowSpeech(true);
    } else if (prevScrapingRef.current && !scraping && leadsFound > 0) {
      flyToWaypoint('vault', `🎉 Master Vault Loaded! ${leadsFound} total verified leads ready!`, 'dance');
      setActionChips([
        { label: "📂 Open Master Vault", query: "__OPEN_VAULT__" }
      ]);
      setShowSpeech(true);
      const timer = setTimeout(() => {
        flyToWaypoint('patrol', "Resuming territorial perimeter sweep! 👑", 'walking');
      }, 4500);
      return () => clearTimeout(timer);
    } else if (!scraping && (currentWaypoint === 'leads' || currentWaypoint === 'map')) {
      flyToWaypoint('patrol', "Master perimeter patrol active! Ready for orders!", 'walking');
    }
    prevScrapingRef.current = scraping;
  }, [scraping, activeZone, leadsFound, flyToWaypoint, currentWaypoint]);

  // Listen for search input focus
  useEffect(() => {
    const handleSearchFocus = () => {
      if (!scraping && currentWaypoint !== 'search') {
        flyToWaypoint('search', "Perched at Master Omnibox! Select a territory or category!", 'fly');
      }
    };
    window.addEventListener('leadharvest:search-focus', handleSearchFocus);
    return () => window.removeEventListener('leadharvest:search-focus', handleSearchFocus);
  }, [scraping, currentWaypoint, flyToWaypoint]);

  // Screen patrol loop
  useEffect(() => {
    if (minimized || currentWaypoint !== 'patrol' || isTransitioning || scraping) return;

    const walkInterval = setInterval(() => {
      if (['dance', 'trip', 'tap', 'peek', 'dig', 'sprint'].includes(actionState)) return;

      setPosX(prev => {
        const speed = 0.35 * direction;
        const next = prev + speed;

        if (next >= 88) {
          setDirection(-1);
          return 87.5;
        }
        if (next <= 12) {
          setDirection(1);
          return 12.5;
        }
        return next;
      });
    }, 45);

    return () => clearInterval(walkInterval);
  }, [direction, scraping, actionState, minimized, currentWaypoint, isTransitioning]);

  // Comical actions & autonomous roaming (every 3.5s)
  useEffect(() => {
    if (minimized || isTransitioning) return;

    const humorTimer = setInterval(() => {
      if (scraping) {
        const randomMsg = FUNNY_MESSAGES_MASTER[Math.floor(Math.random() * FUNNY_MESSAGES_MASTER.length)];
        setSpeech(randomMsg);
        setShowSpeech(true);
        return;
      }

      if (currentWaypoint === 'search' && Math.random() < 0.35) {
        flyToWaypoint('patrol', "Gliding back to territorial patrol! 👑", 'walking');
        return;
      }

      if (currentWaypoint === 'patrol' && Math.random() < 0.22) {
        flyToWaypoint('search', "🚀 Swooping to Master Console to propose sweeps!", 'fly');
        const rec = MASTER_RECOMMENDATIONS[Math.floor(Math.random() * MASTER_RECOMMENDATIONS.length)];
        setActionChips(rec.chips);
        setShowSpeech(true);
        return;
      }

      const roll = Math.random();

      if (roll < 0.20) {
        setActionState('trip');
        setSpeech("Whoops! High-voltage telecom trunk line! ⚡ Master armor intact!");
        setActionChips([]);
        setShowSpeech(true);
        setTimeout(() => setActionState('walking'), 2200);
      } else if (roll < 0.40) {
        setActionState('dance');
        setSpeech("🤖 *Master Breakdance* State-wide lead mining is effortless!");
        setActionChips([]);
        setShowSpeech(true);
        setTimeout(() => setActionState('walking'), 2800);
      } else if (roll < 0.60) {
        setActionState('tap');
        setSpeech("👀 *Knock knock* Ready to launch the next territorial sweep?");
        setActionChips([]);
        setShowSpeech(true);
        setTimeout(() => setActionState('walking'), 2200);
      } else if (roll < 0.80) {
        setActionState('peek');
        setSpeech("Radar sweeping 26 districts & 679 mandals simultaneously! 🛰️");
        setActionChips([]);
        setShowSpeech(true);
        setTimeout(() => setActionState('walking'), 2200);
      } else {
        const rec = MASTER_RECOMMENDATIONS[Math.floor(Math.random() * MASTER_RECOMMENDATIONS.length)];
        setSpeech(rec.speech);
        setActionChips(rec.chips);
        setShowSpeech(true);
      }
    }, 3500);

    return () => clearInterval(humorTimer);
  }, [scraping, minimized, currentWaypoint, isTransitioning, flyToWaypoint]);

  const handleClick = () => {
    setClickCount(prev => prev + 1);
    setSpeech("👑 Master Commander Diggy ready! Where should I deploy?");
    setShowSpeech(true);
    setShowFlightMenu(prev => !prev);

    if (actionState !== 'dance' && !scraping) {
      setActionState('dance');
      setTimeout(() => {
        setActionState(currentWaypoint === 'patrol' ? 'walking' : 'idle');
      }, 2000);
    }
  };

  if (minimized) {
    return (
      <div
        className="diggy-minimized-pill"
        onClick={() => setMinimized(false)}
        title="Click to summon Master Diggy!"
      >
        <span className="mini-pulse-dot" />
        <Mascot3D mode="idle" size={26} />
        <span>Master Scout (Expand)</span>
      </div>
    );
  }

  return (
    <div
      className={`diggy-screen-companion-layer ${isTransitioning ? 'is-flying' : currentWaypoint === 'patrol' ? 'is-patrolling' : ''} ${scraping ? 'is-scraping-frenzy' : ''}`}
      style={{ left: `${posX}%`, top: `${posY}%` }}
    >
      {/* Speech / Scream Bubble (Floating Anchor Inverts Automatically Below Diggy When Perched High!) */}
      <div className={`diggy-bubble-anchor ${isInverted ? 'is-inverted' : ''}`}>
        <AnimatePresence>
          {showSpeech && (
            <motion.div
              className={`diggy-companion-bubble ${scraping ? 'bubble-scream' : ''}`}
              initial={{ opacity: 0, y: isInverted ? -12 : 12, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: isInverted ? 8 : -8, scale: 0.88 }}
              transition={{ type: 'spring', damping: 14 }}
            >
              <div className="bubble-content">
                <div className="bubble-main-msg">
                  {scraping && <span className="scream-flame">🔥</span>}
                  <span>{speech}</span>
                </div>

                {/* Interactive Flight Waypoint Quick-Travel Chips */}
                {showFlightMenu && !scraping && (
                  <div className="bubble-chips-row">
                    <button
                      type="button"
                      className="bubble-flight-chip"
                      onClick={(e) => {
                        e.stopPropagation();
                        flyToWaypoint('search', "🚀 Swooping to Master Omnibox! Choose your target!", 'fly');
                        setShowFlightMenu(false);
                      }}
                    >
                      <Navigation size={9} /> <span>Fly to Search</span>
                    </button>
                    <button
                      type="button"
                      className="bubble-flight-chip"
                      onClick={(e) => {
                        e.stopPropagation();
                        flyToWaypoint('radar', "💎 Hovering at State Radar HUD! Swarm linked!", 'fly');
                        setShowFlightMenu(false);
                      }}
                    >
                      <Radio size={9} /> <span>State Radar HUD</span>
                    </button>
                    <button
                      type="button"
                      className="bubble-flight-chip"
                      onClick={(e) => {
                        e.stopPropagation();
                        flyToWaypoint('vault', "📂 Perched at Universal Vault! Multi-tenant sync active!", 'dance');
                        setShowFlightMenu(false);
                      }}
                    >
                      <Database size={9} /> <span>Universal Vault</span>
                    </button>
                    <button
                      type="button"
                      className="bubble-flight-chip"
                      onClick={(e) => {
                        e.stopPropagation();
                        flyToWaypoint('patrol', "🚶 Gliding down to territorial perimeter patrol!", 'walking');
                        setShowFlightMenu(false);
                      }}
                    >
                      <Compass size={9} /> <span>Perimeter Patrol</span>
                    </button>
                  </div>
                )}

                {/* Interactive Search Action Chips */}
                {!scraping && !showFlightMenu && actionChips && actionChips.length > 0 && (
                  <div className="bubble-chips-row">
                    {actionChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="bubble-action-chip"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (chip.query === '__OPEN_VAULT__') {
                            if (onOpenVault) onOpenVault();
                          } else {
                            handleTriggerSearch(chip.query);
                          }
                        }}
                        title={`Click to run sweep: ${chip.query}`}
                      >
                        <Search size={9} />
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="bubble-close-btn"
                onClick={e => { e.stopPropagation(); setShowSpeech(false); }}
                title="Dismiss bubble"
              >
                <X size={10} />
              </button>
              <i className="bubble-tail-arrow" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* The 3D Animated Mascot Character */}
      <div
        className={`diggy-companion-sprite dir-${direction > 0 ? 'right' : 'left'} state-${actionState}`}
        onClick={handleClick}
        title="I am Master Diggy! Click me to order a flight or see my state operations!"
      >
        {currentWaypoint === 'patrol' && (
          <div className="diggy-patrol-ground-dust">
            <span className="dust-particle p1" />
            <span className="dust-particle p2" />
            <span className="dust-particle p3" />
          </div>
        )}

        <Mascot3D
          mode={
            scraping ? 'dig' :
            isTransitioning || actionState === 'sprint' ? 'fly' :
            actionState === 'dance' ? 'dance' :
            actionState === 'trip' ? 'trip' :
            actionState === 'tap' ? 'tap' :
            actionState === 'peek' ? 'peek' :
            actionState === 'dig' ? 'dig' :
            actionState === 'walking' ? 'walk' :
            actionState === 'fly' ? 'fly' :
            'idle'
          }
          size={115}
          rotationY={direction > 0 ? 15 : -15}
        />

        <div className="diggy-action-tag">
          {scraping ? (
            <span className="tag-scraping">
              <Zap size={9} /> MASTER SWARM ACTIVE!
            </span>
          ) : isTransitioning ? (
            <span className="tag-scraping" style={{ background: 'linear-gradient(135deg, #0284c7, #00f0ff)' }}>
              <Navigation size={9} /> JETPACK FLIGHT
            </span>
          ) : actionState === 'dance' ? (
            <span className="tag-dancing">
              <Sparkles size={9} /> MASTER DANCE!
            </span>
          ) : actionState === 'trip' ? (
            <span className="tag-dancing" style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', color: '#fca5a5' }}>
              <Zap size={9} /> OOPS! WIRE STUMBLE!
            </span>
          ) : actionState === 'tap' ? (
            <span className="tag-patrol" style={{ color: '#fef08a', borderColor: '#f59e0b' }}>
              <Award size={9} /> KNOCK KNOCK!
            </span>
          ) : actionState === 'peek' ? (
            <span className="tag-patrol" style={{ color: '#a7f3d0', borderColor: '#10b981' }}>
              <Compass size={9} /> SCOUT RADAR
            </span>
          ) : currentWaypoint === 'search' ? (
            <span className="tag-patrol" style={{ color: '#38bdf8', borderColor: '#00f0ff' }}>
              <Search size={9} /> PERCHED: CONSOLE
            </span>
          ) : currentWaypoint === 'radar' ? (
            <span className="tag-patrol" style={{ color: '#fde047', borderColor: '#f59e0b' }}>
              <Radio size={9} /> TERRITORIAL RADAR
            </span>
          ) : currentWaypoint === 'vault' ? (
            <span className="tag-patrol" style={{ color: '#6ee7b7', borderColor: '#10b981' }}>
              <Database size={9} /> UNIVERSAL VAULT
            </span>
          ) : (
            <span className="tag-patrol">MASTER PATROL</span>
          )}
        </div>
      </div>

      <button
        type="button"
        className="diggy-minimize-btn"
        onClick={() => setMinimized(true)}
        title="Minimize Master Diggy"
      >
        <X size={11} />
      </button>
    </div>
  );
}
