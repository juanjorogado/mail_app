// Stand-alone MCP client for Penpot integration (demo)
(function(){
  const wsUrl = 'ws://localhost:4402';
  let ws;
  let reqId = 1;
  let pages = [];
  function log(...args){ console.log('[standalone-mcp]', ...args); }

  function ensureStructureContainer(){
    let s = document.getElementById('structure');
    if(!s){
      s = document.createElement('pre');
      s.id = 'structure';
      s.style.whiteSpace = 'pre-wrap';
      document.body.appendChild(s);
    }
    return s;
  }

  function send(obj){ ws.send(JSON.stringify(obj)); }

  function start(){
    ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      log('WebSocket connected');
      const init = { jsonrpc: '2.0', id: reqId++, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, clientInfo: { name: 'standalone-mcp-demo', version: '1.0.0' } } };
      send(init);
    };
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data);
        if(m.id === 1 && m.result){
          const q = { jsonrpc: '2.0', id: reqId++, method: 'tools/call', params: { name: 'execute_code', arguments: { code: "return penpotUtils.getPages().map(p => ({id: p.id, name: p.name}))" } } };
          send(q);
        } else if(m.id === 2 && m.result){
          pages = m.result;
          const mailbox = pages.find(p => p.name && p.name.toLowerCase().includes('mailbox')) || null;
          const mailboxList = document.getElementById('mailboxList');
          mailboxList && (mailboxList.innerHTML = mailbox ? pages.map(p => `<div class='mailbox'>${p.name}</div>`).join('') : '');
          if(mailbox){
            const code = `const page = penpotUtils.getPageById('${mailbox.id}'); return penpotUtils.shapeStructure(page.root, 5);`;
            const str = { jsonrpc: '2.0', id: reqId++, method: 'tools/call', params: { name: 'execute_code', arguments: { code } } };
            send(str);
          } else {
            log('Mailbox page not found');
          }
        } else if(m.id === 3 && m.result){
          const viewer = document.getElementById('viewerContent');
          if (viewer) {
            viewer.textContent = JSON.stringify(m.result, null, 2);
          } else {
            const structureEl = ensureStructureContainer();
            structureEl.textContent = JSON.stringify(m.result, null, 2);
          }
        } else if(m.error){
          log('MCP error:', m.error);
        }
      } catch(err){ log('Failed to parse MCP message', err); }
    };
    ws.onerror = (err) => log('WS error', err);
    ws.onclose = () => log('WS closed');
  }

  // Start on load
  window.addEventListener('load', start, { once: true });
})();
