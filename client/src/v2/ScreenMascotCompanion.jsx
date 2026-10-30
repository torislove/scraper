import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Zap, Search, Compass, Award, Navigation, Database, Radio } from 'lucide-react';
import Mascot3D from './Mascot3D';
import './screenMascot.css';

const WAYPOINTS = {
  patrol: { id: 'patrol', name: 'Edge Patrol', x: null, y: 84, mode: 'walking', label: 'SCOUT PATROL' },
  search: { id: 'search', name: 'Search Omnibox', x: 58, y: 13, mode: 'fly', label: 'PERCHED: SEARCH CONSOLE' },
  leads:  { id: 'leads',  name: 'Leads Stream',    x: 28, y: 44, mode: 'dig', label: 'MINING LIVE LEADS' },
  radar:  { id: 'radar',  name: 'Telemetry Radar', x: 82, y: 40, mode: 'fly', label: 'ACTIVE RADAR MESH' },
  vault:  { id: 'vault',  name: 'CRM Vault',       x: 18, y: 26, mode: 'dance', label: 'CRM VAULT CELEBRATION' },
  map:    { id: 'map',    name: 'Excavation Grid', x: 48, y: 56, mode: 'dig', label: 'EXCAVATOR DIVE' }
};

const FUNNY_MESSAGES = [
  "⛏️ I AM SCRAPING! Digging up fresh +91 WhatsApp leads!",
  "📡 Sniffing out shop owners & business phone lines...",
  "💎 Oof! Hit a goldmine of verified phone numbers!",
  "⚡ Jetpack thrusters engaged! 18–24 leads per second!",
  "👀 Psst! 84% of these leads have active WhatsApp!",
  "🤖 Don't mind me, just mining through 619,287 villages!",
  "📍 Just locked onto target radar coordinates!",
  "🎉 Another verified mobile saved to your CRM vault!",
  "👑 Master handles the big states, but I run this city!",
  "🔥 Ninety seconds and you'll have 200+ direct contacts!"
];

const CLICK_REACTIONS = [
  "⚡ Whoa! That tickles boss! Keep the scrape going!",
  "⛏️ Can't stop now, my golden pickaxe is glowing hot!",
  "💎 Chief! Look at all these +91 phone numbers pouring in!",
  "🚀 Parachuting into the next constituent ward!",
  "🎩 Diggy at your service! Ready to export to WhatsApp!",
  "📱 Ring ring! That's the sound of 100+ new customers!",
  "💪 Single city & mandal precision is my superpower!"
];

const SMART_RECOMMENDATIONS = [
  {
    speech: "Want me to mine hot high-yield leads? Click one to launch!",
    chips: [
      { label: "📸 Wedding Photographers", query: "wedding photographers in vijayawada" },
      { label: "🍽️ Catering Services", query: "catering services in tenali with whatsapp" }
    ]
  },
  {
    speech: "High conversion rates detected in these local sectors:",
    chips: [
      { label: "🏢 Event Planners", query: "event planners in vijayawada" },
      { label: "💄 Bridal Makeup", query: "bridal makeup artists in guntur" }
    ]
  },
  {
    speech: "Ready to harvest verified phone lines directly?",
    chips: [
      { label: "🛠️ Hardware Stores", query: "hardware suppliers in vijayawada" },
      { label: "🏡 Real Estate Brokers", query: "real estate brokers in hyderabad" }
    ]
  },
  {
    speech: "Need B2B contractor phone numbers with WhatsApp?",
    chips: [
      { label: "🏗️ Civil Contractors", query: "civil building contractors in vijayawada" },
      { label: "💡 Electrical Works", query: "electrical contractors in tenali" }
    ]
  }
];

/**
 * ScreenMascotCompanion
 * Living, 3D articulated, humorous screen companion ("Diggy").
 * 
 * Features:
 * - 60FPS fluid screen edge traversal with bipedal stride
 * - 8 kinetic action states: walk, sprint, dig, dance, trip, tap, peek, idle
 * - Intelligent website interaction: suggests and launches relative searches
 * - Interactive action chips inside comic speech balloons
 * - High-frequency random comedy loop (every 3.5s)
 * - Click reactions and Easter eggs
 */
export default function ScreenMascotCompanion({
  scraping = false,
  activeZone = '',
  leadsFound = 0,
  onOpenVault = null,
  onTriggerSearch = null
}) {
  const [currentWaypoint, setCurrentWaypoint] = useState('patrol');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [posX, setPosX] = useState(78); // percentage along screen width
  const [posY, setPosY] = useState(84); // percentage along screen height
  const [direction, setDirection] = useState(1); // 1 = right, -1 = left
  const [actionState, setActionState] = useState('walking'); // 'walking' | 'sprint' | 'dig' | 'dance' | 'trip' | 'tap' | 'peek' | 'idle'
  const [speech, setSpeech] = useState("Hi boss! I'm Diggy. Ready to mine leads!");
  const [actionChips, setActionChips] = useState([
    { label: "📸 Wedding Photographers", query: "wedding photographers in vijayawada" },
    { label: "🍽️ Catering Services", query: "catering in tenali with whatsapp" }
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
    setActionState('sprint'); // ignites jetpack thrusters!
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

  // Trigger relative search directly on website
  const handleTriggerSearch = (query) => {
    setActionChips([]);
    setSpeech(`🚀 Mining "${query}"! Watch the map!`);
    setActionState('sprint');
    setShowSpeech(true);

    if (typeof onTriggerSearch === 'function') {
      onTriggerSearch(query);
    } else {
      // Dispatch custom global event so SearchConsole / CommandCenter can capture it
      window.dispatchEvent(new CustomEvent('leadharvest:search', { detail: { query } }));
    }

    setTimeout(() => {
      setActionState('dig');
    }, 1800);
  };

  // Track previous scraping state so celebration triggers once on complete, then returns to walk
  const prevScrapingRef = useRef(scraping);

  // When scraping state changes, trigger high-energy sprint or digging alert!
  useEffect(() => {
    if (scraping) {
      flyToWaypoint('leads', `⛏️ MINING LIVE LEADS STREAM! Extracting verified phone lines!`, 'dig');
      setActionChips([]);
      setShowSpeech(true);
    } else if (prevScrapingRef.current && !scraping && leadsFound > 0) {
      flyToWaypoint('vault', `🎉 BOOM! Excavated ${leadsFound} verified leads! Ready for WhatsApp!`, 'dance');
      setActionChips([
        { label: "📂 Open CRM Vault", query: "__OPEN_VAULT__" }
      ]);
      setShowSpeech(true);
      const timer = setTimeout(() => {
        flyToWaypoint('patrol', "Resuming perimeter lead patrol boss! ⛏️", 'walking');
      }, 4500);
      return () => clearTimeout(timer);
    } else if (!scraping && (currentWaypoint === 'leads' || currentWaypoint === 'map')) {
      flyToWaypoint('patrol', "Perimeter patrol active! Ready for your command boss!", 'walking');
    }
    prevScrapingRef.current = scraping;
  }, [scraping, leadsFound, flyToWaypoint, currentWaypoint]);

  // Listen for search input focus to fly to search console!
  useEffect(() => {
    const handleSearchFocus = () => {
      if (!scraping && currentWaypoint !== 'search') {
        flyToWaypoint('search', "Perched at the Search Console! Type a query or tap my shortcuts!", 'fly');
      }
    };
    window.addEventListener('leadharvest:search-focus', handleSearchFocus);
    return () => window.removeEventListener('leadharvest:search-focus', handleSearchFocus);
  }, [scraping, currentWaypoint, flyToWaypoint]);

  // Ultra-fluid screen patrol loop (only moves when at bottom 'patrol' waypoint)
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

  // High-frequency comical actions, autonomic roaming & smart search nudges (every 3.5s)
  useEffect(() => {
    if (minimized || isTransitioning) return;

    const humorTimer = setInterval(() => {
      if (scraping) {
        const randomMsg = FUNNY_MESSAGES[Math.floor(Math.random() * FUNNY_MESSAGES.length)];
        setSpeech(randomMsg);
        setShowSpeech(true);
        return;
      }

      // If perched at Search Console for more than 12s, automatically swoop back to patrol
      if (currentWaypoint === 'search' && Math.random() < 0.35) {
        flyToWaypoint('patrol', "Gliding back to perimeter patrol! ⛏️", 'walking');
        return;
      }

      // If at patrol edge, 25% chance to take autonomous flight up to Search Console!
      if (currentWaypoint === 'patrol' && Math.random() < 0.22) {
        flyToWaypoint('search', "🚀 Taking flight to scout the Search Console!", 'fly');
        const rec = SMART_RECOMMENDATIONS[Math.floor(Math.random() * SMART_RECOMMENDATIONS.length)];
        setActionChips(rec.chips);
        setShowSpeech(true);
        return;
      }

      // Random action selector when on patrol
      const roll = Math.random();

      if (roll < 0.20) {
        setActionState('trip');
        setSpeech("Whoops! Tripped over a telecom wire! ⚡ I'm okay!");
        setActionChips([]);
        setShowSpeech(true);
        setTimeout(() => setActionState('walking'), 2200);
      } else if (roll < 0.40) {
        setActionState('dance');
        setSpeech("🤖 *Robot breakdance* Lead harvesting is my passion!");
        setActionChips([]);
        setShowSpeech(true);
        setTimeout(() => setActionState('walking'), 2800);
      } else if (roll < 0.60) {
        setActionState('tap');
        setSpeech("👀 *Knock knock* Are you ready to find more leads boss?");
        setActionChips([]);
        setShowSpeech(true);
        setTimeout(() => setActionState('walking'), 2200);
      } else if (roll < 0.80) {
        setActionState('peek');
        setSpeech("Psst! I'm sniffing out business lines with WhatsApp! 📱");
        setActionChips([]);
        setShowSpeech(true);
        setTimeout(() => setActionState('walking'), 2200);
      } else {
        const rec = SMART_RECOMMENDATIONS[Math.floor(Math.random() * SMART_RECOMMENDATIONS.length)];
        setSpeech(rec.speech);
        setActionChips(rec.chips);
        setShowSpeech(true);
      }
    }, 3500);

    return () => clearInterval(humorTimer);
  }, [scraping, minimized, currentWaypoint, isTransitioning, flyToWaypoint]);

  // Interactive click handler
  const handleClick = () => {
    setClickCount(prev => prev + 1);
    const reaction = CLICK_REACTIONS[clickCount % CLICK_REACTIONS.length];
    setSpeech(reaction);
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
        title="Click to summon Diggy the 3D Lead Harvester!"
      >
        <span className="mini-pulse-dot" />
        <Mascot3D mode="idle" size={26} />
        <span>Diggy (Click to Expand)</span>
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
                        flyToWaypoint('search', "🚀 Swooping to Search Omnibox! Type a city!", 'fly');
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
                        flyToWaypoint('radar', "💎 Hovering at Radar HUD! Mesh locked!", 'fly');
                        setShowFlightMenu(false);
                      }}
                    >
                      <Radio size={9} /> <span>Live Radar HUD</span>
                    </button>
                    <button
                      type="button"
                      className="bubble-flight-chip"
                      onClick={(e) => {
                        e.stopPropagation();
                        flyToWaypoint('vault', "📂 Perched at CRM Vault! 100% verified!", 'dance');
                        setShowFlightMenu(false);
                      }}
                    >
                      <Database size={9} /> <span>CRM Vault</span>
                    </button>
                    <button
                      type="button"
                      className="bubble-flight-chip"
                      onClick={(e) => {
                        e.stopPropagation();
                        flyToWaypoint('patrol', "🚶 Gliding down to perimeter patrol!", 'walking');
                        setShowFlightMenu(false);
                      }}
                    >
                      <Compass size={9} /> <span>Edge Patrol</span>
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
                        title={`Click to mine: ${chip.query}`}
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
        title="I am Diggy! Click me to order a flight or see my tricks!"
      >
        {/* Footprint / Thruster Ground Dust Sparks (Only shown on bottom patrol) */}
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

        {/* Dynamic Action Status Tag */}
        <div className="diggy-action-tag">
          {scraping ? (
            <span className="tag-scraping">
              <Zap size={9} /> I AM SCRAPING!
            </span>
          ) : isTransitioning ? (
            <span className="tag-scraping" style={{ background: 'linear-gradient(135deg, #0284c7, #00f0ff)' }}>
              <Navigation size={9} /> JETPACK FLIGHT
            </span>
          ) : actionState === 'dance' ? (
            <span className="tag-dancing">
              <Sparkles size={9} /> DANCE BREAK!
            </span>
          ) : actionState === 'trip' ? (
            <span className="tag-dancing" style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444', color: '#fca5a5' }}>
              <Zap size={9} /> OOPS! STUMBLED!
            </span>
          ) : actionState === 'tap' ? (
            <span className="tag-patrol" style={{ color: '#fef08a', borderColor: '#f59e0b' }}>
              <Award size={9} /> KNOCK KNOCK!
            </span>
          ) : actionState === 'peek' ? (
            <span className="tag-patrol" style={{ color: '#a7f3d0', borderColor: '#10b981' }}>
              <Compass size={9} /> SCOUT PEEK
            </span>
          ) : currentWaypoint === 'search' ? (
            <span className="tag-patrol" style={{ color: '#38bdf8', borderColor: '#00f0ff' }}>
              <Search size={9} /> PERCHED: SEARCH
            </span>
          ) : currentWaypoint === 'radar' ? (
            <span className="tag-patrol" style={{ color: '#fde047', borderColor: '#f59e0b' }}>
              <Radio size={9} /> RADAR HUD
            </span>
          ) : currentWaypoint === 'vault' ? (
            <span className="tag-patrol" style={{ color: '#6ee7b7', borderColor: '#10b981' }}>
              <Database size={9} /> CRM VAULT
            </span>
          ) : (
            <span className="tag-patrol">SCOUT PATROL</span>
          )}
        </div>
      </div>

      {/* Quick Minimize Button */}
      <button
        type="button"
        className="diggy-minimize-btn"
        onClick={() => setMinimized(true)}
        title="Minimize Diggy to small badge"
      >
        <X size={11} />
      </button>
    </div>
  );
}
