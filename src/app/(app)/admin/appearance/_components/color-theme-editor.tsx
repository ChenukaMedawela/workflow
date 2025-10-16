
"use client";

import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logAudit } from '@/lib/audit-log';
import { useAuth } from '@/hooks/use-auth';

interface ColorThemeEditorProps {
  initialPrimaryColor: string;
}

// Converts a hex color string to an HSL object
const hexToHslComponents = (hex: string): { h: number; s: number; l: number } => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex[1] + hex[2], 16);
    g = parseInt(hex[3] + hex[4], 16);
    b = parseInt(hex[5] + hex[6], 16);
  }

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
  };
};

// Converts HSL color values to a hex string
const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100;
    const a = (s * Math.min(l, 1 - l)) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function ColorThemeEditor({ initialPrimaryColor }: ColorThemeEditorProps) {
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSaveTheme = async () => {
    try {
      const { h, s, l: primaryLightness } = hexToHslComponents(primaryColor);

      // Make the accent color 50% lighter than the primary color
      const accentLightness = primaryLightness + (100 - primaryLightness) * 0.5;

      const primaryHslString = `${h} ${s}% ${primaryLightness}%`;
      const accentHslString = `${h} ${s}% ${accentLightness}%`;
      const accentHex = hslToHex(h, s, accentLightness);

      const themeRef = doc(db, 'settings', 'theme');
      const themeData = {
        primary: primaryHslString,
        accent: accentHslString,
        primary_hex: primaryColor,
        accent_hex: accentHex
      };
      
      await setDoc(themeRef, themeData, { merge: true });

      await logAudit({
          action: 'update_theme',
          to: themeData,
          user,
      });

      toast({ title: "Theme Updated", description: "Your new color theme has been saved." });
    } catch (error) {
      console.error("Error updating theme:", error);
      toast({ title: "Error", description: "Failed to update theme.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Customization</CardTitle>
        <CardDescription>Customize the application's primary color. The accent color will be automatically generated to be a lighter shade.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <Input
              id="primary-color"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-20 h-10 p-1"
            />
          </div>
        </div>
        <Button onClick={handleSaveTheme}>Save Theme</Button>
      </CardContent>
    </Card>
  );
}
