import axios from 'axios';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { OAuthAccount } from '../../models/index.js';
import { throwHttpError } from '../search/search.service.js';

const VAULT_ID = 'mpss-extension';
const VAULT_NAME = 'MPSS 浏览器插件';
const ROOT_FOLDER = 'MPSS';
const SOURCE_MODE = 'SYNC_MANAGED';

export const syncMarkdownToBaizhiKnowledgeBase = async ({ userId, markdown, title, source }) => {
  const content = String(markdown || '').trim();
  if (!content) throwHttpError('missing_markdown_content', 400);

  const oauthAccount = await OAuthAccount.findOne({
    where: {
      userId,
      provider: 'baizhi',
    },
    order: [['id', 'DESC']],
  });

  if (!oauthAccount?.accessToken) {
    throwHttpError('missing_baizhi_authorization', 400);
  }

  await registerVault(oauthAccount.accessToken);

  const resourceName = `${sanitizeFileName(title || source || 'MPSS AI 分析')}.md`;
  const localPath = `${ROOT_FOLDER}/${buildTimestamp()}-${resourceName}`;
  const response = await postKnowledgeBase(oauthAccount.accessToken, '/api/knowledgeBase/sync/batchUpsertMarkdown', {
    items: [
      {
        vaultId: VAULT_ID,
        localPath,
        resourceName,
        folderName: ROOT_FOLDER,
        content,
        localHash: sha256(content),
        sourceMode: SOURCE_MODE,
      },
    ],
  });

  const result = response?.data?.results?.[0];
  if (!response?.success || !result?.success) {
    throwHttpError(result?.errorMessage || response?.message || 'baizhi_knowledge_base_sync_failed', 502);
  }

  return {
    vaultId: VAULT_ID,
    localPath: result.localPath || localPath,
    resourceId: result.resourceId,
    resourceName: result.resourceName || resourceName,
    folderId: result.folderId,
    folderName: result.folderName || ROOT_FOLDER,
    bindingId: result.bindingId,
    bindingVersion: result.bindingVersion,
    remoteUpdatedAt: result.remoteUpdatedAt,
    status: result.status,
  };
};

const registerVault = async (accessToken) =>
  postKnowledgeBase(accessToken, '/api/knowledgeBase/sync/registerVault', {
    vaultId: VAULT_ID,
    vaultName: VAULT_NAME,
    syncRoots: [ROOT_FOLDER],
    remoteImportDir: ROOT_FOLDER,
  });

const postKnowledgeBase = async (accessToken, path, body) => {
  try {
    const { data, status } = await axios.post(`${env.baizhi.knowledgeBaseUrl}${path}`, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000,
      validateStatus: () => true,
    });

    if (status === 401) throwHttpError('baizhi_authorization_expired', 400);
    if (status >= 400) throwHttpError(data?.message || 'baizhi_knowledge_base_sync_failed', 502);
    if (data?.code === 6001 || data?.code === 401) throwHttpError('baizhi_authorization_expired', 400);
    if (data?.success === false) throwHttpError(mapBaizhiError(data), 400);

    return data;
  } catch (error) {
    if (error.status) throw error;
    throwHttpError(error.response?.data?.message || 'baizhi_knowledge_base_network_error', 502);
  }
};

const mapBaizhiError = (data) => {
  const message = data?.message || '';
  if (data?.code === 6001 || data?.code === 401) return 'baizhi_authorization_expired';
  if (data?.code === 12001) return 'baizhi_knowledge_base_storage_insufficient';
  if (data?.code === 12101) return 'baizhi_knowledge_base_permission_denied';
  return message || 'baizhi_knowledge_base_sync_failed';
};

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const buildTimestamp = () => new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');

const sanitizeFileName = (value) =>
  String(value || '')
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'MPSS AI 分析';
