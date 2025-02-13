javascript
const { default: to } = require('await-to-js');
const { workflowLib } = require('../../libs/worklow/worflowLib');
const { messages } = require('../../utils/messages');
const { responseCodes } = require('../../utils/responseCodes');
const { responseHandler } = require('../../utils/responseHandler');
const { inventoryController } = require('../inventory/inventoryController');
const axios = require('axios');
const { jobModel } = require('../../models/jobsModel');
const { executionModel } = require('../../models/executionModel');

const handleResponse = (res, err, data, successMessage, failureMessage) => {
  if (err) {
    return responseHandler(res, err, failureMessage, [], responseCodes.SERVER_ERROR);
  }
  return responseHandler(res, null, successMessage, data, responseCodes.SUCCESS);
};

const createNewWorkflow = async (req, res) => {
  const [error, createdWorkflow] = await to(workflowLib.createWorkflow(req.body));
  return handleResponse(res, error, { createdWorkflow }, messages.SUCCESS, messages.EXISTS);
};

const fetchWorkflows = async (req, res) => {
  const [error, workflowData] = await to(workflowLib.getWorkflows(req.query?.search, req.query?.state === 'undefined' ? '' : req.query?.state));
  if (error) return handleResponse(res, error, null, null, messages.SERVER_ERROR);
  if (workflowData.length === 0) {
    return responseHandler(res, null, messages.NOT_FOUND, [], responseCodes.NOT_FOUND);
  }
  return handleResponse(res, null, { workflowData }, messages.SUCCESS, null);
};

const fetchWorkflowById = async (req, res) => {
  const [error, workflowData] = await to(workflowLib.getWorkflowById(req.params?.id));
  if (error) return handleResponse(res, error, null, null, messages.SERVER_ERROR);
  if (!workflowData || workflowData.length === 0) {
    return responseHandler(res, null, messages.NOT_FOUND, [], responseCodes.NOT_FOUND);
  }
  return handleResponse(res, null, { workflowData }, messages.SUCCESS, null);
};

const updateWorkflow = async (req, res) => {
  const [error, workflowData] = await to(workflowLib.updateWorkflow(req.params?.id, req?.body));
  return handleResponse(res, error, { workflowData }, messages.SUCCESS, null);
};

const removeWorkflow = async (req, res) => {
  const [error, workflowData] = await to(workflowLib.deleteWorkflow(req.params?.id));
  return handleResponse(res, error, { workflowData }, messages.SUCCESS, null);
};

const delay = (sec) => new Promise(resolve => setTimeout(resolve, sec * 1000));

const execWorkflow = async (req, res) => {
  try {
    const { workflowid, sids } = req.body;
    let tsdate = new Date();
    const [error, workflowData] = await to(workflowLib.getWorkflowById(workflowid));
    if (error || !workflowData || workflowData.length === 0) {
      return handleResponse(res, error || null, null, null, messages.NOT_FOUND);
    }

    const jobIDs = await jobModel.find({}, { jobId: 1, _id: 0 });
    const maxId = Math.max( ...jobIDs.map(job => job.jobId || 10000)) + 1;
    const opsJob = new jobModel({ jobName: workflowData.name, jobId: maxId, status: 'pending', createdBy: 'test-user', workflowId: workflowData._id });

    const nodes = workflowData.nodes.filter(i => i.type !== 'end' && i.type !== 'start');
    const execOrder = workflowData.executionOrder.filter(i => i.type !== 'end' && i.type !== 'start');
    const results = await Promise.all(sids.map(server => processWorkflowOnServer(server, workflowData, execOrder, nodes, opsJob)));
    
    await finalizeJobExecution(opsJob, results, sids.length);
    return responseHandler(res, null, messages.SUCCESS, results, responseCodes.SUCCESS);
  } catch (error) {
    return responseHandler(res, error.stack, messages.SERVER_ERROR, [], responseCodes.SERVER_ERROR);
  }
};

const processWorkflowOnServer = async (server, workflowData, execOrder, nodes, opsJob) => {
  const execVal = await new executionModel({ server: server.HostName, jobId: opsJob._id });
  const results = [];

  for (const order of execOrder) {
    const item = nodes.find(i => i.id === order.id);
    if (item) {
      if (item.type === "delay") {
        await delay(item.data.command);
      } else {
        let result = await executeNode(item, server);
        results.push(result);
      }
    }
  }
  await execVal.save();
  return results;
};

const executeNode = async (node, server) => {
  const { command, type } = node.data;
  const remoteHost = server.IP;
  let result;

  if (type.toLowerCase() === 'api') {
    result = await executeApiCommand(command);
  } else if (type.toLowerCase() === 'script' || type.toLowerCase() === 'command') {
    result = await executeScriptOrCommand(type, remoteHost, command, server);
  }

  return { server: server.HostName, output: result };
};

const executeApiCommand = async (command) => {
  const response = await axios[command.type](command.url);
  return { command: command.url, response: JSON.stringify(response.data) };
};

const executeScriptOrCommand = async (type, host, command, server) => {
  return new Promise((resolve) => {
    const executeFunc = type.toLowerCase() === 'script' ? inventoryController.execDBScript : inventoryController.execCommand1;
    executeFunc(host, 'clouduser', command, 'command', server.SID, server.Instance, (err, response) => {
      if (response) {
        resolve({ command, response: response.output });
      } else {
        resolve({ command, response: 'Failed to connect to server' });
      }
    });
  });
};

const finalizeJobExecution = async (opsJob, results, serverCount) => {
  const isJobFailed = results.some(result => result.output.includes('failed'));
  const servers = results.map(result => ({ server: result.server, execId: opsJob._id }));
  await jobModel.updateOne({ _id: opsJob._id }, { servers, status: isJobFailed ? 'failed' : 'success' });
};

const workflowController = {
  createNewWorkflow,
  fetchWorkflows,
  fetchWorkflowById,
  updateWorkflow,
  execWorkflow,
  removeWorkflow,
};

module.exports = { workflowController };
