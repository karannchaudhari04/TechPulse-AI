package com.techpulse.controller;

import com.techpulse.model.TechnologyEvent;
import com.techpulse.repository.TechnologyEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class DeepLinkController {

    @Autowired
    private TechnologyEventRepository technologyEventRepository;

    @Value("${android.sha256.fingerprint:71:BC:9C:71:07:82:E2:3C:F8:55:A2:33:16:F7:FA:4C:FF:18:E5:B0:08:AD:49:BC:60:09:47:43:1F:57:44:B3}")
    private String sha256Fingerprint;

    @GetMapping("/")
    @ResponseBody
    @Cacheable(value = "totalBiteCount", key = "'global'")
    public String index() {
        return "TechPulse AI API is Live. Total Events: " + technologyEventRepository.count();
    }

    @GetMapping(value = "/.well-known/assetlinks.json", produces = "application/json")
    @ResponseBody
    public String serveAssetLinks() {
        return """
            [
              {
                "relation": ["delegate_permission/common.handle_all_urls"],
                "target": {
                  "namespace": "android_app",
                  "package_name": "com.techpulse.app",
                  "sha256_cert_fingerprints": [
                    "%s"
                  ]
                }
              }
            ]
            """.formatted(sha256Fingerprint);
    }

    @GetMapping("/bite/{id}")
    public String handleDeepLink(@PathVariable String id, Model model) {
        TechnologyEvent event = technologyEventRepository.findById(id).orElse(null);
        
        if (event != null) {
            model.addAttribute("id", event.getId());
            model.addAttribute("title", event.getTitle());
            model.addAttribute("summary", event.getSummary());
            // Safe fallback image for deep link metadata
            model.addAttribute("thumbnail", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800");
            model.addAttribute("category", "Tech");
        } else {
            model.addAttribute("id", "");
            model.addAttribute("title", "TechPulse AI | Technology Intelligence");
            model.addAttribute("summary", "AI-powered technology intelligence platform for developers.");
            model.addAttribute("thumbnail", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800");
            model.addAttribute("category", "Tech");
        }
        
        return "deeplink";
    }
}
