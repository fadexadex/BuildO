export interface CircuitNode {
  id: string;
  type: 'input' | 'output' | 'gate' | 'constraint' | 'component';
  label: string;
  position: [number, number, number];
  value?: number | string;
  status?: 'default' | 'active' | 'error' | 'success';
  parentId?: string;
  children?: string[]; // IDs of children
  collapsed?: boolean;
  arraySize?: number;
}

export interface CircuitEdge {
  from: string;
  to: string;
  active?: boolean;
  status?: 'default' | 'active' | 'error';
}

export const parseCircuitForVisualization = (circuitCode: string) => {
  const newNodes: CircuitNode[] = [];
  const newEdges: CircuitEdge[] = [];
  
  // Simple parser for demonstration - in production, use proper AST parsing
  const lines = circuitCode.split('\n');
  
  // Extract signals
  const inputSignals: { name: string, arraySize?: number }[] = [];
  const outputSignals: string[] = [];
  
  lines.forEach(line => {
    const inputMatch = line.match(/signal\s+input\s+(\w+)\s*;/);
    const arrayInputMatch = line.match(/signal\s+input\s+(\w+)\[(\d+)\]/);
    const outputMatch = line.match(/signal\s+output\s+(\w+)/);
    
    if (arrayInputMatch) {
        inputSignals.push({ name: arrayInputMatch[1], arraySize: parseInt(arrayInputMatch[2]) });
    } else if (inputMatch) {
        inputSignals.push({ name: inputMatch[1] });
    }

    if (outputMatch) outputSignals.push(outputMatch[1]);
  });
  
  // Create input nodes
  inputSignals.forEach((signal, idx) => {
    newNodes.push({
      id: `input-${signal.name}`,
      type: 'input',
      label: signal.name,
      position: [-3, idx * 1.5 - (inputSignals.length * 0.75), 0],
      status: 'default',
      arraySize: signal.arraySize
    });
  });
  
  // Create constraint/gate nodes
  lines.forEach((line, idx) => {
    const constraintMatch = line.match(/(\w+)\s*(<==|===)\s*(.+);/);
    if (constraintMatch) {
      const nodeId = `gate-${idx}`;
      newNodes.push({
        id: nodeId,
        type: 'gate',
        label: constraintMatch[1], // Use the assigned variable as label
        position: [0, idx * 0.5 - 2, 0],
        status: 'default'
      });
      
      // Create edges from inputs to this gate
      inputSignals.forEach(signal => {
        if (constraintMatch[3].includes(signal.name)) {
          newEdges.push({
            from: `input-${signal.name}`,
            to: nodeId,
            status: 'default'
          });
        }
      });
    }
  });
  
  // Create output nodes
  outputSignals.forEach((signal, idx) => {
    const nodeId = `output-${signal}`;
    newNodes.push({
      id: nodeId,
      type: 'output',
      label: signal,
      position: [3, idx * 1.5 - (outputSignals.length * 0.75), 0],
      status: 'default'
    });
    
    // Connect gates to outputs
    newNodes.forEach(node => {
      if (node.type === 'gate' && node.label === signal) {
          // Direct assignment to output
           newEdges.push({
            from: node.id,
            to: nodeId,
            status: 'default'
          });
      }
      // Also check if gate output flows to this output (simplified)
      if (node.type === 'gate') {
          // If the gate label matches the output signal (already handled)
          // This is very basic dependency tracking
      }
    });
  });
  
  // Logic to create a "Main" component group wrapper if needed
  // For now, we keep it flat for the basic parser
  
  return { nodes: newNodes, edges: newEdges };
};
