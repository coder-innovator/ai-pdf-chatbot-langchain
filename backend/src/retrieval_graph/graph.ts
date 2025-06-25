import { StateGraph, START, END } from '@langchain/langgraph';
import { AgentStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import { formatDocs } from './utils.js';
import { HumanMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { RESPONSE_SYSTEM_PROMPT, ROUTER_SYSTEM_PROMPT } from './prompts.js';
import { RunnableConfig } from '@langchain/core/runnables';
import {
  AgentConfigurationAnnotation,
  ensureAgentConfiguration,
} from './configuration.js';
import { loadChatModel } from '../shared/utils.js';

// Import financial Q&A components
import { 
  FinancialQueryProcessor, 
  createFinancialQueryProcessor,
  ProcessedQuery 
} from './nodes/financial-query-processor.js';
import { 
  MockContextRetriever, 
  createMockContextRetriever,
  RetrievedContext 
} from './nodes/mock-context-retriever.js';
import { 
  TradingQAAgent, 
  createTradingQAAgent,
  TradingAnswer 
} from './agents/trading-qa.js';

async function checkQueryType(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<{
  route: 'retrieve' | 'direct' | 'financial';
  processedQuery?: ProcessedQuery;
}> {
  // Check if this is a financial query first
  const queryProcessor = createFinancialQueryProcessor();
  
  try {
    const processedQuery = await queryProcessor.processQuery(state.query);
    
    // If it's a financial query with high confidence, route to financial handler
    if (processedQuery.confidence > 0.6 || 
        processedQuery.entities.tickers.length > 0 ||
        ['PRICE_INQUIRY', 'SIGNAL_REQUEST', 'TECHNICAL_ANALYSIS', 'RISK_ASSESSMENT'].includes(processedQuery.queryType)) {
      
      console.log(`🔍 Detected financial query: ${processedQuery.queryType} (confidence: ${processedQuery.confidence.toFixed(2)})`);
      return { route: 'financial', processedQuery };
    }
  } catch (error) {
    console.warn('Financial query processing failed, falling back to standard routing:', error);
  }

  // Fall back to standard routing for non-financial queries
  const schema = z.object({
    route: z.enum(['retrieve', 'direct']),
    directAnswer: z.string().optional(),
  });

  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);

  const routingPrompt = ROUTER_SYSTEM_PROMPT;

  const formattedPrompt = await routingPrompt.invoke({
    query: state.query,
  });

  const response = await model
    .withStructuredOutput(schema)
    .invoke(formattedPrompt.toString());

  const route = response.route;

  return { route };
}

async function answerQueryDirectly(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const configuration = ensureAgentConfiguration(config);
  const model = await loadChatModel(configuration.queryModel);
  const userHumanMessage = new HumanMessage(state.query);

  const response = await model.invoke([userHumanMessage]);
  return { messages: [userHumanMessage, response] };
}

async function handleFinancialQuery(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  console.log('📊 Processing financial query with Trading Q&A Agent');
  
  try {
    // Create a mock storage adapter (in real implementation, this would be the actual storage)
    const mockStorage = {
      async vectorSearch(embedding: number[], limit: number = 5) {
        // Mock vector search results
        return [
          { id: '1', content: 'Sample trading signal data', similarity: 0.8 },
          { id: '2', content: 'Technical analysis information', similarity: 0.7 },
          { id: '3', content: 'Market sentiment data', similarity: 0.6 }
        ];
      },
      async select(table: string, options: any) {
        // Mock database query results
        if (table === 'trading_signals') {
          return [{
            id: 'signal_1',
            ticker: options.ticker || 'AAPL',
            action: 'BUY',
            confidence: 0.8,
            currentPrice: 150.25,
            targetPrice: 165.00,
            reasoning: 'Strong technical indicators and positive sentiment',
            timestamp: new Date(),
            riskAssessment: {
              overallRisk: 'MEDIUM',
              riskScore: 45,
              warnings: ['Market volatility'],
              recommendations: ['Monitor closely', 'Consider position sizing']
            }
          }];
        }
        return [];
      }
    };

    // Create Trading Q&A Agent
    const qaAgent = createTradingQAAgent(mockStorage as any);
    
    // Get answer from Q&A agent
    const answer = await qaAgent.answerQuestion(state.query);
    
    // Format the response message
    let responseText = answer.answer;
    
    if (answer.confidence < 0.7) {
      responseText += '\n\n⚠️ Note: This answer has moderate confidence. Please verify with additional sources.';
    }
    
    if (answer.disclaimers && answer.disclaimers.length > 0) {
      responseText += '\n\n📋 Disclaimers:\n' + answer.disclaimers.map(d => `• ${d}`).join('\n');
    }
    
    if (answer.suggestedActions && answer.suggestedActions.length > 0) {
      responseText += '\n\n💡 Suggested Actions:\n' + answer.suggestedActions.map(a => `• ${a}`).join('\n');
    }
    
    if (answer.followUpQuestions && answer.followUpQuestions.length > 0) {
      responseText += '\n\n❓ Follow-up Questions:\n' + answer.followUpQuestions.map(q => `• ${q}`).join('\n');
    }

    const userHumanMessage = new HumanMessage(state.query);
    const assistantMessage = new HumanMessage(responseText); // Using HumanMessage as placeholder for AI message

    return { 
      messages: [userHumanMessage, assistantMessage],
      financialAnswer: answer 
    };
    
  } catch (error) {
    console.error('❌ Financial query processing failed:', error);
    
    // Fallback to direct answer
    const userHumanMessage = new HumanMessage(state.query);
    const fallbackMessage = new HumanMessage(
      "I apologize, but I encountered an error processing your financial query. Please try rephrasing your question or ask about a specific stock ticker."
    );
    
    return { messages: [userHumanMessage, fallbackMessage] };
  }
}

async function routeQuery(
  state: typeof AgentStateAnnotation.State,
): Promise<'retrieveDocuments' | 'directAnswer' | 'financialQuery'> {
  const route = state.route;
  if (!route) {
    throw new Error('Route is not set');
  }

  if (route === 'retrieve') {
    return 'retrieveDocuments';
  } else if (route === 'direct') {
    return 'directAnswer';
  } else if (route === 'financial') {
    return 'financialQuery';
  } else {
    throw new Error('Invalid route');
  }
}

async function retrieveDocuments(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const retriever = await makeRetriever(config);
  const response = await retriever.invoke(state.query);

  return { documents: response };
}

async function generateResponse(
  state: typeof AgentStateAnnotation.State,
  config: RunnableConfig,
): Promise<typeof AgentStateAnnotation.Update> {
  const configuration = ensureAgentConfiguration(config);
  const context = formatDocs(state.documents);
  const model = await loadChatModel(configuration.queryModel);
  const promptTemplate = RESPONSE_SYSTEM_PROMPT;

  const formattedPrompt = await promptTemplate.invoke({
    question: state.query,
    context: context,
  });

  const userHumanMessage = new HumanMessage(state.query);

  // Create a human message with the formatted prompt that includes context
  const formattedPromptMessage = new HumanMessage(formattedPrompt.toString());

  const messageHistory = [...state.messages, formattedPromptMessage];

  // Let MessagesAnnotation handle the message history
  const response = await model.invoke(messageHistory);

  // Return both the current query and the AI response to be handled by MessagesAnnotation's reducer
  return { messages: [userHumanMessage, response] };
}

const builder = new StateGraph(
  AgentStateAnnotation,
  AgentConfigurationAnnotation,
)
  .addNode('retrieveDocuments', retrieveDocuments)
  .addNode('generateResponse', generateResponse)
  .addNode('checkQueryType', checkQueryType)
  .addNode('directAnswer', answerQueryDirectly)
  .addNode('financialQuery', handleFinancialQuery)
  .addEdge(START, 'checkQueryType')
  .addConditionalEdges('checkQueryType', routeQuery, [
    'retrieveDocuments',
    'directAnswer',
    'financialQuery',
  ])
  .addEdge('retrieveDocuments', 'generateResponse')
  .addEdge('generateResponse', END)
  .addEdge('directAnswer', END)
  .addEdge('financialQuery', END);

export const graph = builder.compile().withConfig({
  runName: 'RetrievalGraph',
});
