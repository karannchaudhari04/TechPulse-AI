package com.techpulse.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GeminiConfig {

    @Value("${spring.ai.openai.explain-api-key}")
    private String explainApiKey;

    @Value("${spring.ai.openai.base-url:https://generativelanguage.googleapis.com/v1beta/openai/}")
    private String baseUrl;

    @Bean(name = "explainChatClient")
    public ChatClient explainChatClient() {
        OpenAiApi openAiApi = new OpenAiApi(baseUrl, explainApiKey);
        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .withModel("gemini-2.5-flash")
                .withTemperature(0.5f)
                .build();
        OpenAiChatModel openAiChatModel = new OpenAiChatModel(openAiApi, options);
        return ChatClient.create(openAiChatModel);
    }
}
