package com.techbite.controller;

import com.techbite.model.Bite;
import com.techbite.repository.BiteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class DeepLinkController {

    @Autowired
    private BiteRepository biteRepository;

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
