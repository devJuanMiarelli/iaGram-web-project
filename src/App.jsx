import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GoogleGenerativeAI } from "@google/generative-ai";
import './App.css';

const initialNodes = [
  {
    id: '0',
    type: 'input',
    data: { label: 'Node' },
    position: { x: 0, y: 50 },
  },
];

let id = 1;
const getId = () => `${id++}`;
const nodeOrigin = [0.5, 0];

const AddNodeOnEdgeDrop = () => {
  const reactFlowWrapper = useRef(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]); // Estado para armazenar mensagens

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid) {
        const id = getId();
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;
        const newNode = {
          id,
          position: screenToFlowPosition({
            x: clientX,
            y: clientY,
          }),
          data: { label: `Node ${id}` },
          origin: [0.5, 0.0],
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
          eds.concat({ id, source: connectionState.fromNode.id, target: id }),
        );
      }
    },
    [screenToFlowPosition],
  );

  const sendPrompt = async () => {
    const requestId = getId();
    setMessages((prevMessages) => [
      ...prevMessages,
      { text: inputValue, type: 'user', id: requestId }
    ]);

    const apiKey = 'AIzaSyBlIj3LRy27a6SLx7fUMuVz0xnul24ECZU'; 
    const genAI = new GoogleGenerativeAI(apiKey);
    setInputValue("");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(inputValue);
      const generatedText = await result.response.text();

      const response = await saveMessageInAPI(requestId, inputValue, generatedText);
      console.log("Generated response from API:", response);

      if (response && response.item) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: response.item.response, type: 'api', id: requestId }
        ]);
      } else {
        console.error("Resposta da API está com estrutura incorreta:", response);
      }

      console.log("Messages after API response:", messages);
    } catch (error) {
      console.error("Erro ao gerar conteúdo:", error);
    }
  };

  const saveMessageInAPI = async (id, request, response) => {
    try {
      const res = await fetch('http://localhost:8000/items/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, request, response }),
      });

      if (!res.ok) {
        throw new Error('Erro ao salvar na API');
      }

      return await res.json();
    } catch (error) {
      console.error('Erro ao salvar a mensagem:', error);
    }
  };

  return (
    <div className="wrapper" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }} ref={reactFlowWrapper}>
      <header>
        <nav className="navbar nav-index-color">
          <div className="logo">
            <img src="/logo_icon.png" alt="Logo" />
            <div className="title">iaGram</div>
          </div>
        </nav>
      </header>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        fitView
        fitViewOptions={{ padding: 2 }}
        nodeOrigin={nodeOrigin}
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
        <Panel position="top-left">
          <div className="search-box" style={{ width: '320px', height: '180px', background: '#EAEAEA', padding: '10px', borderRadius: '5px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', overflowY: 'auto' }}>
            <div className="messages">
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <p key={index} className={msg.type === 'user' ? "user-requests" : "api-responses"}>
                    {msg.text}
                  </p>
                ))
              ) : (
                <p className='api-responses'>Nothing to show!</p>
              )}
            </div>
            <input
              className="input-search"
              type="search"
              placeholder="Send your prompt..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendPrompt()}
            />
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default () => (
  <ReactFlowProvider>
    <AddNodeOnEdgeDrop />
  </ReactFlowProvider>
);
