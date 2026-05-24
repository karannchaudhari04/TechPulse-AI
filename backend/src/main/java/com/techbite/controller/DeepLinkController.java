package com.techbite.controller;

import com.techbite.model.Bite;
import com.techbite.repository.BiteRepository;
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
    private BiteRepository biteRepository;

    @Value("${android.sha256.fingerprint:71:BC:9C:71:07:82:E2:3C:F8:55:A2:33:16:F7:FA:4C:FF:18:E5:B0:08:AD:49:BC:60:09:47:43:1F:57:44:B3}")
    private String sha256Fingerprint;

    @GetMapping("/")
    @ResponseBody
    @Cacheable(value = "totalBiteCount", key = "'global'")
    public String index() {
        return "TechBite API is Live. Total Bites: " + biteRepository.count();
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
                  "package_name": "com.techbite.app",
                  "sha256_cert_fingerprints": [
                    "%s"
                  ]
                }
              }
            ]
            """.formatted(sha256Fingerprint);
    }

    @GetMapping("/bite/{id}")
    public String handleDeepLink(@PathVariable Long id, Model model) {
        Bite bite = biteRepository.findById(id).orElse(null);
        
        if (bite != null) {
            model.addAttribute("id", bite.getId());
            model.addAttribute("title", bite.getTitle());
            model.addAttribute("summary", bite.getContentSummary());
            model.addAttribute("thumbnail", bite.getThumbnailUrl());
            model.addAttribute("category", bite.getCategory() != null ? bite.getCategory().getName() : "Tech");
        } else {
            model.addAttribute("id", "");
            model.addAttribute("title", "TechBite | Master Tech News");
            model.addAttribute("summary", "Daily high-yield tech news and CS interview prep.");
            model.addAttribute("thumbnail", "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800");
            model.addAttribute("category", "Tech");
        }
        
        return "deeplink";
    }
}
