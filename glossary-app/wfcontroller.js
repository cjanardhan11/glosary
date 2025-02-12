const { default: to } = require('await-to-js');
const { workflowLib } = require('../../libs/worklow/worflowLib');
const { messages } = require('../../utils/messages');
const { responseCodes } = require('../../utils/responseCodes');
const { responseHandler } = require('../../utils/responseHandler');
const { inventoryController } = require('../inventory/inventoryController');
const axios = require('axios');
const { jobModel } = require('../../models/jobsModel');
const { executionModel } = require('../../models/executionModel');

// Utility function for error handling and response handling
const handleErrorResponse = (res, error, message, statusCode) => {
  return responseHandler(res, error.stack || error, message, [], statusCode);
};

const handleSuccessResponse = (res, data, message, statusCode) => {
  return responseHandler(res, null, message, data, statusCode);
};

// Common function for fetching workflow data
const fetchWorkflowData = async (id, search = '', state = '') => {
  let [error, workflowData] = await to(workflowLib.getWorkflowById(id, search, state));
  if (error || !workflowData || workflowData.length === 0) {
    return null;
  }
  return workflowData;
};

const createNewWorkflow = async (req, res) => {
  try {
    const [error, createdWorflow] = await to(workflowLib.createWorkflow(req.body));
    if (error) {
      return handleErrorResponse(res, error, messages.EXISTS, responseCodes.EXISTS);
    }
    return handleSuccessResponse(res, { createdWorflow }, messages.SUCCESS, responseCodes.SUCCESS);
  } catch (err) {
    return handleErrorResponse(res, err, messages.SERVER_ERROR, responseCodes.SERVER_ERROR);
  }
};

const fetchWorkflows = async (req, res) => {
  try {
    const workflowData = await fetchWorkflowData(null, req.query?.search, req.query?.state == 'undefined' ? '' : req.query?.state);
    if (!workflowData) {
      return handleErrorResponse(res, 'No workflows found', messages.NOT_FOUND, responseCodes.NOT_FOUND);
    }
    return handleSuccessResponse(res, { workflowData }, messages.SUCCESS, responseCodes.SUCCESS);
  } catch (error) {
    return handleErrorResponse(res, error, messages.SERVER_ERROR, responseCodes.SERVER_ERROR);
  }
};

const fetchWorkflowById = async (req, res) => {
  try {
    const workflowData = await fetchWorkflowData(req.params?.id);
    if (!workflowData) {
      return handleErrorResponse(res, 'Workflow not found', messages.NOT_FOUND, responseCodes.NOT_FOUND);
    }
    return handleSuccessResponse(res, { workflowData }, messages.SUCCESS, responseCodes.SUCCESS);
  } catch (error) {
    return handleErrorResponse(res, error, messages.SERVER_ERROR, responseCodes.SERVER_ERROR);
  }
};

const updateWorkflow = async (req, res) => {
  try {
    const [error, updatedWorkflow] = await to(workflowLib.updateWorkflow(req.params?.id, req?.body));
    if (error) {
      return handleErrorResponse(res, error, messages.SERVER_ERROR, responseCodes.SERVER_ERROR);
    }
    return handleSuccessResponse(res, { updatedWorkflow }, messages.SUCCESS, responseCodes.SUCCESS);
  } catch (error) {
    return handleErrorResponse(res, error, messages.SERVER_ERROR, responseCodes.SERVER_ERROR);
  }
};

const removeWorkflow = async (req, res) => {
  try {
    const [error, deletedWorkflow] = await to(workflowLib.deleteWorkflow(req.params?.id));
    if (error) {
      return handleErrorResponse(res, error, messages.SERVER_ERROR, responseCodes.SERVER_ERROR);
    }
    return handleSuccessResponse(res, { deletedWorkflow }, messages.SUCCESS, responseCodes.SUCCESS);
  } catch (error) {
    return handleErrorResponse(res, error, messages.SERVER_ERROR, responseCodes.SERVER_ERROR);
  }
};

const execWorkflow = async (req, res) => {
  try {
    const workflowData = await fetchWorkflowData(req.body?.workflowid);
    if (!workflowData) {
      return handleErrorResponse(res, 'Workflow not found', messages.NOT_FOUND, responseCodes.NOT_FOUND);
    }

    const jobIDs = await jobModel.find({}, { jobId: 1, _id: 0 });
    const tempIds = jobIDs.map((job) => job.jobId);
    const maxId = Math.max(...tempIds, 10000) + 1;

    const opsJob = new jobModel({
      jobName: workflowData.name,
      jobId: maxId,
      status: 'pending',
      createdBy: 'test-user',
      workflowId: workflowData._id,
    });

    const execOrder = workflowData.executionOrder.filter((i) => i.type !== 'end' && i.type !== 'start');
    let results = [];
    const execVal = {};

    await Promise.all(
      req.body.sids.map(async (server) => {
        execVal[server.HostName] = new executionModel({
          server: server.HostName,
          jobId: opsJob._id,
        });
        const resultsForServer = [];

        for (let order of execOrder) {
          let item = workflowData.nodes.find((node) => node.id === order.id);
          if (item?.type === 'delay') {
            await delay(item.data.command);
          } else {
            const result = await executeNode(item, server);
            resultsForServer.push(result);
          }
        }

        await Promise.all(resultsForServer);
        return resultsForServer;
      })
    );

    return handleSuccessResponse(res, results, messages.SUCCESS, responseCodes.SUCCESS);
  } catch (error) {
    return handleErrorResponse(res, error, messages.SERVER_ERROR, responseCodes.SERVER_ERROR);
  }
};

const executeNode = async (item, server) => {
  // Logic for executing a node depending on its type (API, Script, Command)
  // Simulate async execution
  let result;
  switch (item.type.toLowerCase()) {
    case 'api':
      result = await axiosRequest(item.data.command.url, item.data.command.type);
      break;
    case 'script':
      result = await executeScript(item, server);
      break;
    case 'command':
      result = await executeCommand(item, server);
      break;
    default:
      result = 'Unknown node type';
  }
  return result;
};

const axiosRequest = async (url, type) => {
  try {
    let response;
    if (type === 'get') {
      response = await axios.get(url);
    } else {
      response = await axios.post(url);
    }
    return response.data;
  } catch (error) {
    return error;
  }
};

const executeScript = (item, server) => {
  // Logic to execute script
};

const executeCommand = (item, server) => {
  // Logic to execute command
};

const delay = (sec) => new Promise((resolve) => setTimeout(resolve, sec * 1000));

const workflowController = {
  createNewWorkflow,
  fetchWorkflows,
  fetchWorkflowById,
  updateWorkflow,
  execWorkflow,
  removeWorkflow,
};

module.exports = { workflowController };
