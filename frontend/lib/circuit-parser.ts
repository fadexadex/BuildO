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
  // New fields for array support
  name?: string; // The raw signal name (e.g., "x")
  isArray?: boolean;
  size?: string | number;
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
  
  // 1. Try to identify the main component and its template arguments
  const mainMatch = circuitCode.match(/component\s+main\s*=\s*(\w+)\s*\(([^)]+)\)/);
  let mainTemplateName = '';
  let mainArgs: string[] = [];
  
  if (mainMatch) {
      mainTemplateName = mainMatch[1];
      // Split by comma but handle potential nested parens if needed (simple split for now)
      mainArgs = mainMatch[2].split(',').map(s => s.trim());
  }

  // 2. Find the template definition to map arguments to parameters
  // Regex to match "template Name(Param1, Param2) {"
  const templateRegex = new RegExp(`template\\s+${mainTemplateName}\\s*\\(([^)]*)\\)`);
  const templateMatch = circuitCode.match(templateRegex);
  const paramMap = new Map<string, string>();
  
  if (templateMatch && mainArgs.length > 0) {
      const params = templateMatch[1].split(',').map(s => s.trim()).filter(p => p);
      params.forEach((p, i) => {
          if (i < mainArgs.length) {
              paramMap.set(p, mainArgs[i]);
          }
      });
  }

  // Extract signals with array awareness
  const inputSignals: {name: string, size?: string}[] = [];
  const outputSignals: {name: string, size?: string}[] = [];
  
  lines.forEach(line => {
    // Match "signal input x;" or "signal input x[N];" or "signal input x[10];"
    const inputMatch = line.match(/signal\s+input\s+(\w+)(?:\s*\[([^\]]+)\])?/);
    const outputMatch = line.match(/signal\s+output\s+(\w+)(?:\s*\[([^\]]+)\])?/);
    
    if (inputMatch) {
        let size = inputMatch[2];
        if (size && paramMap.has(size)) {
            size = paramMap.get(size)!;
        }
        inputSignals.push({ name: inputMatch[1], size });
    }
    if (outputMatch) {
        let size = outputMatch[2];
        if (size && paramMap.has(size)) {
            size = paramMap.get(size)!;
        }
        outputSignals.push({ name: outputMatch[1], size });
    }
  });
  
  // Create input nodes
  inputSignals.forEach((signal, idx) => {
    const isArray = !!signal.size;
    const label = isArray ? `${signal.name}[${signal.size}]` : signal.name;
    
    newNodes.push({
      id: `input-${signal.name}`,
      type: 'input',
      label: label,
      name: signal.name,
      position: [-3, idx * 1.5 - (inputSignals.length * 0.75), 0],
      status: 'default',
      isArray,
      size: signal.size
    });
  });
  
  // Create constraint/gate nodes
  lines.forEach((line, idx) => {
    const constraintMatch = line.match(/(\w+)(?:\[[^\]]+\])?\s*(<==|===)\s*(.+);/);
    if (constraintMatch) {
      const nodeId = `gate-${idx}`;
      const targetVar = constraintMatch[1]; // e.g. 'y' or 'c'
      
      // Determine if we are assigning to an array index
      const isArrayAssignment = line.includes(`${targetVar}[`);
      
      newNodes.push({
        id: nodeId,
        type: 'gate',
        label: isArrayAssignment ? `${targetVar}[i]` : targetVar, // Simplified label
        position: [0, idx * 0.5 - 2, 0],
        status: 'default'
      });
      
      // Create edges from inputs to this gate
      inputSignals.forEach(signal => {
        // Naive check: if constraint string includes input name
        // Enhance: check for exact word boundary match to avoid matching substrings
        const regex = new RegExp(`\\b${signal.name}\\b`);
        if (regex.test(constraintMatch[3])) {
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
    const nodeId = `output-${signal.name}`;
    const isArray = !!signal.size;
    const label = isArray ? `${signal.name}[${signal.size}]` : signal.name;

    newNodes.push({
      id: nodeId,
      type: 'output',
      label: label,
      position: [3, idx * 1.5 - (outputSignals.length * 0.75), 0],
      status: 'default',
      isArray,
      size: signal.size
    });
    
    // Connect gates to outputs
    newNodes.forEach(node => {
      if (node.type === 'gate') {
          // Basic logic: if gate assigns to this output variable
          // The gate label might be "y" or "y[i]" and output is "y"
          const gateTarget = node.label.replace(/\[.*\]/, '');
          if (gateTarget === signal.name) {
             newEdges.push({
                from: node.id,
                to: nodeId,
                status: 'default'
             });
          }
      }
    });
  });
  
  return { nodes: newNodes, edges: newEdges };
};
