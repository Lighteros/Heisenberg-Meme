(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bar = document.getElementById("bar");
  const seek = document.getElementById("seek");
  const menu = document.querySelector(".menu");
  const links = document.getElementById("links");
  const flask = document.getElementById("flask");

  const onScroll = () => {
    bar.classList.toggle("stuck", window.scrollY > 8);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    seek.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  menu.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    menu.setAttribute("aria-expanded", open ? "true" : "false");
  });
  links.querySelectorAll("a").forEach((anchor) => {
    anchor.addEventListener("click", () => {
      links.classList.remove("open");
      menu.setAttribute("aria-expanded", "false");
    });
  });

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.getAttribute("data-copy");
      try {
        await navigator.clipboard.writeText(value);
      } catch (err) {
        const area = document.createElement("textarea");
        area.value = value;
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      const previous = btn.textContent;
      btn.textContent = "Copied";
      btn.classList.add("done");
      setTimeout(() => {
        btn.textContent = previous;
        btn.classList.remove("done");
      }, 1400);
    });
  });

  const rise = () => {
    document.querySelectorAll(".rise").forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        el.classList.add("in");
      }
    });
  };
  rise();
  window.addEventListener("scroll", rise, { passive: true });

  if (!reduced && flask) {
    window.addEventListener("pointermove", (event) => {
      const dx = (event.clientX / window.innerWidth - 0.5) * 18;
      const dy = (event.clientY / window.innerHeight - 0.5) * 12;
      flask.style.transform = "translate(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px)";
    });
  }

  const money = (value) => {
    if (!Number.isFinite(value)) return "—";
    if (value >= 1e6) return "$" + (value / 1e6).toFixed(2) + "M";
    if (value >= 1e3) return "$" + (value / 1e3).toFixed(1) + "K";
    return "$" + value.toFixed(2);
  };

  const loadQuotes = async () => {
    try {
      const res = await fetch("https://api.dexscreener.com/latest/dex/pairs/robinhood/0xAF36a2B5F81aB17c194462654E211B569a1F3CDC");
      const data = await res.json();
      const pair = data.pair || (data.pairs && data.pairs[0]);
      if (!pair) return;
      const board = document.getElementById("quotes");
      const price = document.getElementById("q-price");
      const mcap = document.getElementById("q-mcap");
      const liq = document.getElementById("q-liq");
      const chg = document.getElementById("q-chg");
      const change = Number(pair.priceChange && pair.priceChange.h24);
      price.textContent = pair.priceUsd ? "$" + Number(pair.priceUsd).toPrecision(4) : "—";
      mcap.textContent = money(Number(pair.marketCap));
      liq.textContent = money(Number(pair.liquidity && pair.liquidity.usd));
      chg.textContent = Number.isFinite(change) ? (change > 0 ? "+" : "") + change.toFixed(1) + "%" : "—";
      chg.classList.toggle("up", change > 0);
      chg.classList.toggle("down", change < 0);
      board.hidden = false;
    } catch (err) {
      /* live quotes stay hidden if the book is unreachable */
    }
  };
  loadQuotes();

  const canvas = document.getElementById("formula");
  const ctx = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  const nodes = [];
  const pointer = { x: 0.72, y: 0.32 };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const seed = () => {
    nodes.length = 0;
    const count = Math.round(Math.min(72, (width * height) / 18000));
    for (let i = 0; i < count; i += 1) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.7
      });
    }
  };

  const tick = () => {
    ctx.clearRect(0, 0, width, height);
    const px = pointer.x * width;
    const py = pointer.y * height;

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < -20) a.x = width + 20;
      if (a.x > width + 20) a.x = -20;
      if (a.y < -20) a.y = height + 20;
      if (a.y > height + 20) a.y = -20;

      const dx = a.x - px;
      const dy = a.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist < 140) {
        a.vx += (dx / dist) * 0.01;
        a.vy += (dy / dist) * 0.01;
      }
      a.vx *= 0.995;
      a.vy *= 0.995;

      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        const gap = Math.hypot(a.x - b.x, a.y - b.y);
        if (gap < 118) {
          ctx.strokeStyle = "rgba(240, 196, 0," + (0.14 * (1 - gap / 118)).toFixed(3) + ")";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = "rgba(240, 196, 0, 0.72)";
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(240, 196, 0, 0.08)";
    ctx.beginPath();
    ctx.arc(px, py, 46, 0, Math.PI * 2);
    ctx.stroke();
    requestAnimationFrame(tick);
  };

  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX / window.innerWidth;
    pointer.y = event.clientY / window.innerHeight;
  }, { passive: true });

  resize();
  seed();
  window.addEventListener("resize", () => {
    resize();
    seed();
  });
  if (!reduced) tick();
})();
