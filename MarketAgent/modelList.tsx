import { AI_AGENT_MODEL } from "@illa-public/public-types"
import MetaIcon from "./assets/meta.svg?react"
import OpenAIIcon from "./assets/openai.svg?react"
import { LLM } from "./interface"

export const getLLM = (type: AI_AGENT_MODEL): LLM | undefined => {
  return allModelList.find((item) => item.value === type)
}

export const isPremiumModel = (type: AI_AGENT_MODEL): boolean => {
  return premiumModelList.some((item) => item.value === type)
}

export const freeModelList: LLM[] = [
  {
    name: "GPT-3.5-turbo",
    value: AI_AGENT_MODEL.GPT_3_5_TURBO,
    logo: <OpenAIIcon title="GPT-3.5-turbo Icon" />,
    limit: 4096,
    temperatureRange: [0.1, 2],
  },
  {
    name: "LLAMA_2_CHAT_7B",
    value: AI_AGENT_MODEL.LLAMA_2_CHAT_7B,
    logo: <MetaIcon title="LLAMA_2_7B Icon" />,
    limit: 4096,
    temperatureRange: [0.1, 4],
  },
]

export const premiumModelList: LLM[] = [
  {
    name: "GPT-3.5-turbo-16k",
    value: AI_AGENT_MODEL.GPT_3_5_TURBO_16K,
    logo: <OpenAIIcon title="GPT-3.5-turbo-16k Icon" />,
    limit: 16000,
    temperatureRange: [0.1, 2],
  },
  {
    name: "GPT-4",
    value: AI_AGENT_MODEL.GPT_4,
    logo: <OpenAIIcon title="GPT-4 Icon" />,
    limit: 8192,
    temperatureRange: [0.1, 2],
  },
  {
    name: "LLAMA_2_CHAT_13B",
    value: AI_AGENT_MODEL.LLAMA_2_CHAT_13B,
    logo: <MetaIcon title="LLAMA_2_13B Icon" />,
    limit: 4096,
    temperatureRange: [0.1, 4],
  },
]

export const allModelList: LLM[] = [...freeModelList, ...premiumModelList]
