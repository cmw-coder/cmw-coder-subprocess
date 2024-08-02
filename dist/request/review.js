"use strict";
// import {
//   ReviewResult,
//   ReviewState,
//   ReviewRequestParams,
//   Feedback,
//   ReviewParsedResult,
// } from 'shared/types/review';
// import request from 'main/request';
// import Logger from 'electron-log/main';
Object.defineProperty(exports, "__esModule", { value: true });
exports.api_stop_review = exports.api_feedback_review = exports.api_get_code_review_result = exports.api_get_code_review_state = exports.api_code_review = void 0;
// export const api_code_review = async (data: ReviewRequestParams) => {
//   Logger.log('api_code_review start', data);
//   const result = await request<string>({
//     url: '/kong/RdTestAiService/v1/chatgpt/question/review',
//     method: 'post',
//     data,
//   });
//   Logger.log('api_code_review end', result);
//   return result;
// };
// export const api_get_code_review_state = async (serverTaskId: string) =>
//   request<ReviewState>({
//     url: '/kong/RdTestAiService/v1/chatgpt/question/review/status',
//     method: 'get',
//     params: {
//       taskId: serverTaskId,
//     },
//   });
// const parseReviewResult = (data: string[]): ReviewResult => {
//   const result: ReviewResult = {
//     parsed: false,
//     originData: data.join('\\n'),
//     data: [],
//   };
//   try {
//     for (let i = 0; i < data.length; i++) {
//       const item = data[i];
//       const objectArr = JSON.parse(item) as ReviewParsedResult[];
//       if (objectArr.length > 0) {
//         for (let j = 0; j < objectArr.length; j++) {
//           const dataItem = objectArr[j];
//           if (
//             dataItem.Description &&
//             dataItem.ProblemCodeSnippet &&
//             dataItem.Type &&
//             dataItem.IsProblem
//           ) {
//             result.data.push(dataItem);
//           }
//         }
//         result.parsed = true;
//       }
//     }
//   } catch (error) {
//     result.parsed = false;
//     Logger.error('parseReviewResult error', error);
//   }
//   return result;
// };
// export const api_get_code_review_result = async (
//   serverTaskId: string,
// ): Promise<ReviewResult> => {
//   Logger.log('api_get_code_review_result start', serverTaskId);
//   const result = await request<string[]>({
//     url: '/kong/RdTestAiService/v1/chatgpt/question/review/result',
//     method: 'get',
//     params: {
//       taskId: serverTaskId,
//     },
//   });
//   Logger.log('api_get_code_review_result end', result);
//   return parseReviewResult(result);
// };
// export const api_feedback_review = async (
//   serverTaskId: string,
//   userId: string,
//   feedback: Feedback,
//   timestamp: number,
//   comment: string,
// ) => {
//   return request({
//     url: '/kong/RdTestAiService/v1/chatgpt/question/review/feedback',
//     method: 'post',
//     data: {
//       id: serverTaskId,
//       userId,
//       feedback: feedback === Feedback.Helpful ? 1 : 0,
//       timestamp,
//       comment,
//     },
//   });
// };
// export const api_stop_review = async (serverTaskId: string) => {
//   return request({
//     url: '/kong/RdTestAiService/v1/chatgpt/question/review/stop',
//     method: 'post',
//     params: {
//       taskId: serverTaskId,
//     },
//   });
// };
const review_1 = require("../types/review");
const utils_1 = require("../common/utils");
const api_code_review = async (data) => {
    data.language = 'C';
    // console.log('api_code_review', data);
    await (0, utils_1.timeout)(150);
    return Math.random() + '';
};
exports.api_code_review = api_code_review;
const api_get_code_review_state = async (serverTaskId) => {
    console.log('api_get_code_review_state', serverTaskId);
    await (0, utils_1.timeout)(150);
    return review_1.ReviewState.Finished;
};
exports.api_get_code_review_state = api_get_code_review_state;
const parseReviewResult = (data) => {
    const result = {
        parsed: false,
        originData: data.join('\\n'),
        data: [],
    };
    try {
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const objectArr = JSON.parse(item);
            if (objectArr.length > 0) {
                for (let j = 0; j < objectArr.length; j++) {
                    const dataItem = objectArr[j];
                    if (dataItem.Description &&
                        dataItem.ProblemCodeSnippet &&
                        dataItem.Type) {
                        result.data.push(dataItem);
                    }
                }
                result.parsed = true;
            }
        }
    }
    catch (error) {
        result.parsed = false;
    }
    return result;
};
const api_get_code_review_result = async (serverTaskId) => {
    console.log('api_get_code_review_result', serverTaskId);
    await (0, utils_1.timeout)(150);
    const data = [
        '[]',
        `[{
        "Type": "资源释放",
        "IsProblem": false,
        "Number": 1,
        "ProblemCodeSnippet": "if (KEPOLL_INVALID_ID == ulSyncEp)\\n{\\n    atomic_inc(&g_pstSyncStat->stEPCreatErr);\\n    kmem_cache_free(g_pstSyncUCCachep, pstUCObj);\\n    return pstUCObj;\\n}\\n",
        "Description": "在创建epoll对象失败时，释放了单播对象pstUCObj，但没有将其设置为NULL，可能导致悬挂指针问题。"
    },
    {
        "Type": "资源释放",
        "IsProblem": true,
        "Number": 2,
        "ProblemCodeSnippet": "if (ERROR_SUCCESS != ulRet)\\n{\\n    SYNC_Destroy((ULONG)pstUCObj);\\n    pstUCObj = NULL;\\n}\\n",
        "Description": "在某些操作失败后，调用了SYNC_Destroy释放资源，但没有释放相关的epoll对象ulSyncEp，可能导致资源泄漏。"
    }]`,
    ];
    return parseReviewResult(data);
};
exports.api_get_code_review_result = api_get_code_review_result;
const api_feedback_review = async (serverTaskId, userId, feedback, timestamp, comment) => {
    console.log('api_get_code_review_result', serverTaskId, userId, feedback, timestamp, comment);
    await (0, utils_1.timeout)(150);
    return '1111-2222-3333-4444';
};
exports.api_feedback_review = api_feedback_review;
const api_stop_review = async (serverTaskId) => {
    console.log('api_get_code_review_result', serverTaskId);
    await (0, utils_1.timeout)(150);
    return '1111-2222-3333-4444';
};
exports.api_stop_review = api_stop_review;
