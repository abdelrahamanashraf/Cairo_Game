import React, { useMemo, useState } from 'react';
import { Check, Copy, Crosshair, Layers, Shield, Sword } from 'lucide-react';

type WeaponSlotId = 'primary' | 'secondary' | 'melee';
type AttachmentSlotKey = 'optic' | 'muzzle' | 'grip' | 'magazine';

interface AttachmentOption {
  id: string;
  label: string;
  socket: string;
  recoilDelta: number; // % modifier
  adsDelta: number; // % faster ADS
  magBonus: number;
  fovOverride: number | null;
}

interface WeaponSlotSpec {
  id: WeaponSlotId;
  slotEnum: string;
  label: string;
  weaponName: string;
  holsterSocket: string;
  equipTimeSec: number;
  baseMag: number;
  baseAdsFov: number;
  baseDamage: number;
  supportedSlots: AttachmentSlotKey[];
}

const WEAPON_SLOTS: WeaponSlotSpec[] = [
  {
    id: 'primary',
    slotEnum: 'EWeaponSlot::Primary',
    label: 'Primary',
    weaponName: 'MK-18 Cairo Carbine',
    holsterSocket: 'Spine_Primary_Socket',
    equipTimeSec: 0.45,
    baseMag: 30,
    baseAdsFov: 52,
    baseDamage: 26,
    supportedSlots: ['optic', 'muzzle', 'grip', 'magazine'],
  },
  {
    id: 'secondary',
    slotEnum: 'EWeaponSlot::Secondary',
    label: 'Secondary',
    weaponName: 'Helwan 9mm Tactical',
    holsterSocket: 'Thigh_Holster_R',
    equipTimeSec: 0.25,
    baseMag: 15,
    baseAdsFov: 58,
    baseDamage: 20,
    supportedSlots: ['optic', 'muzzle', 'magazine'],
  },
  {
    id: 'melee',
    slotEnum: 'EWeaponSlot::Melee',
    label: 'Melee',
    weaponName: 'Precinct Combat Knife',
    holsterSocket: 'Belt_Sheath_L',
    equipTimeSec: 0.18,
    baseMag: 0,
    baseAdsFov: 68,
    baseDamage: 55,
    supportedSlots: [],
  },
];

const ATTACHMENT_CATALOG: Record<AttachmentSlotKey, AttachmentOption[]> = {
  optic: [
    { id: 'none', label: 'Iron Sights', socket: 'Socket_Optic', recoilDelta: 0, adsDelta: 0, magBonus: 0, fovOverride: null },
    { id: 'red_dot', label: 'Red Dot Sight', socket: 'Socket_Optic', recoilDelta: 0, adsDelta: 15, magBonus: 0, fovOverride: 50 },
    { id: 'acog_4x', label: '4x ACOG Scope', socket: 'Socket_Optic', recoilDelta: -5, adsDelta: -10, magBonus: 0, fovOverride: 30 },
  ],
  muzzle: [
    { id: 'none', label: 'Standard Barrel', socket: 'Socket_Muzzle', recoilDelta: 0, adsDelta: 0, magBonus: 0, fovOverride: null },
    { id: 'compensator', label: 'Compensator', socket: 'Socket_Muzzle', recoilDelta: -22, adsDelta: 0, magBonus: 0, fovOverride: null },
    { id: 'suppressor', label: 'Tactical Suppressor', socket: 'Socket_Muzzle', recoilDelta: -10, adsDelta: -5, magBonus: 0, fovOverride: null },
  ],
  grip: [
    { id: 'none', label: 'No Foregrip', socket: 'Socket_Grip', recoilDelta: 0, adsDelta: 0, magBonus: 0, fovOverride: null },
    { id: 'vertical', label: 'Vertical Foregrip', socket: 'Socket_Grip', recoilDelta: -18, adsDelta: 5, magBonus: 0, fovOverride: null },
    { id: 'angled', label: 'Angled Foregrip', socket: 'Socket_Grip', recoilDelta: -10, adsDelta: 18, magBonus: 0, fovOverride: null },
  ],
  magazine: [
    { id: 'none', label: 'Standard Mag', socket: 'Socket_Mag', recoilDelta: 0, adsDelta: 0, magBonus: 0, fovOverride: null },
    { id: 'ext_quick', label: 'Ext. Quickdraw', socket: 'Socket_Mag', recoilDelta: 0, adsDelta: 0, magBonus: 12, fovOverride: null },
  ],
};

const SLOT_LABELS: Record<AttachmentSlotKey, string> = {
  optic: 'Optic',
  muzzle: 'Muzzle',
  grip: 'Grip',
  magazine: 'Magazine',
};

export const InventoryWeaponryPanel: React.FC = () => {
  const [activeSlot, setActiveSlot] = useState<WeaponSlotId>('primary');
  const [codeTab, setCodeTab] = useState<'blueprint' | 'header' | 'cpp'>('blueprint');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [loadoutAttachments, setLoadoutAttachments] = useState<
    Record<WeaponSlotId, Record<AttachmentSlotKey, string>>
  >({
    primary: { optic: 'red_dot', muzzle: 'compensator', grip: 'vertical', magazine: 'ext_quick' },
    secondary: { optic: 'none', muzzle: 'suppressor', grip: 'none', magazine: 'none' },
    melee: { optic: 'none', muzzle: 'none', grip: 'none', magazine: 'none' },
  });

  const weapon = useMemo(
    () => WEAPON_SLOTS.find((w) => w.id === activeSlot) ?? WEAPON_SLOTS[0],
    [activeSlot],
  );

  const currentMods = loadoutAttachments[activeSlot];

  const computedStats = useMemo(() => {
    let recoilMod = 0;
    let adsSpeedMod = 0;
    let magBonus = 0;
    let adsFov = weapon.baseAdsFov;

    weapon.supportedSlots.forEach((slotKey) => {
      const selectedId = currentMods[slotKey];
      const opt = ATTACHMENT_CATALOG[slotKey].find((a) => a.id === selectedId);
      if (!opt) return;
      recoilMod += opt.recoilDelta;
      adsSpeedMod += opt.adsDelta;
      magBonus += opt.magBonus;
      if (opt.fovOverride !== null) adsFov = opt.fovOverride;
    });

    return {
      recoilMultiplier: Math.max(0.45, Number((1 + recoilMod / 100).toFixed(2))),
      adsSpeedPct: 100 + adsSpeedMod,
      magCapacity: weapon.baseMag > 0 ? weapon.baseMag + magBonus : 0,
      adsFov,
    };
  }, [weapon, currentMods]);

  const cycleAttachment = (slotKey: AttachmentSlotKey) => {
    const list = ATTACHMENT_CATALOG[slotKey];
    const currIdx = list.findIndex((a) => a.id === currentMods[slotKey]);
    const nextItem = list[(currIdx + 1) % list.length];
    setLoadoutAttachments((prev) => ({
      ...prev,
      [activeSlot]: {
        ...prev[activeSlot],
        [slotKey]: nextItem.id,
      },
    }));
  };

  const blueprintSteps = useMemo(() => {
    const opticLabel = ATTACHMENT_CATALOG.optic.find((a) => a.id === currentMods.optic)?.label ?? 'Iron Sights';
    const muzzleLabel = ATTACHMENT_CATALOG.muzzle.find((a) => a.id === currentMods.muzzle)?.label ?? 'Standard Barrel';
    const gripLabel = ATTACHMENT_CATALOG.grip.find((a) => a.id === currentMods.grip)?.label ?? 'No Foregrip';
    const magLabel = ATTACHMENT_CATALOG.magazine.find((a) => a.id === currentMods.magazine)?.label ?? 'Standard Mag';

    if (activeSlot === 'melee') {
      return [
        `Input Action IA_SwitchSlot3 -> Call InventoryComponent->SwitchWeaponSlot(${weapon.slotEnum}).`,
        `Play Holster Montage on active firearm -> AnimNotify 'AN_SwapSockets' re-attaches firearm to its spine/thigh socket.`,
        `Attach BP_CairoKnife from '${weapon.holsterSocket}' to 'WeaponSocket_R' (${weapon.equipTimeSec}s equip blend).`,
        `On Fire Input while Melee equipped: trigger CapsuleTraceByChannel (115cm forward reach, ${weapon.baseDamage} dmg) instead of hitscan rifle trace.`,
      ];
    }

    return [
      `Input Action (1/2/3 or Mobile Slot Tap) -> SwitchWeaponSlot(${weapon.slotEnum}) with IsSwitching guard boolean.`,
      `Holster previous active weapon to its back/thigh socket, then snap '${weapon.weaponName}' from '${weapon.holsterSocket}' to 'WeaponSocket_R' via AnimNotify.`,
      `On EquipAttachment(Slot, DataAsset): attach static mesh to Socket_Optic (${opticLabel}), Socket_Muzzle (${muzzleLabel}), Socket_Grip (${gripLabel}), and Socket_Mag (${magLabel}).`,
      `RecalculateWeaponStats() pushes Recoil x${computedStats.recoilMultiplier}, ADS FOV ${computedStats.adsFov}°, and Mag ${computedStats.magCapacity} directly to CameraSystem & RifleWeapon.`,
    ];
  }, [activeSlot, weapon, currentMods, computedStats]);

  const headerCode = useMemo(
    () => `#pragma once
#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Engine/DataAsset.h"
#include "CairoInventoryComponent.generated.h"

UENUM(BlueprintType)
enum class EWeaponSlot : uint8
{
    Primary   UMETA(DisplayName = "Primary Rifle"),
    Secondary UMETA(DisplayName = "Secondary Pistol"),
    Melee     UMETA(DisplayName = "Melee Blade")
};

UENUM(BlueprintType)
enum class EAttachmentSlot : uint8
{
    Optic, Muzzle, Grip, Magazine
};

UCLASS(BlueprintType)
class CAIROPRECINCT_API UWeaponAttachmentData : public UPrimaryDataAsset
{
    GENERATED_BODY()
public:
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly) EAttachmentSlot SlotType;
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly) TObjectPtr<UStaticMesh> AttachmentMesh;
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly) FName AttachSocketName;
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly) float RecoilScaleDelta = 0.f;
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly) float AdsFovOverride = 0.f;
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly) int32 ExtraMagCapacity = 0;
};

UCLASS(ClassGroup=(Inventory), meta=(BlueprintSpawnableComponent))
class CAIROPRECINCT_API UCairoInventoryComponent : public UActorComponent
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintCallable, Category = "Cairo|Weapons")
    void SwitchWeaponSlot(EWeaponSlot TargetSlot);

    UFUNCTION(BlueprintCallable, Category = "Cairo|Attachments")
    bool EquipAttachment(EWeaponSlot Slot, UWeaponAttachmentData* Attachment);

    UPROPERTY(BlueprintReadOnly, Category = "Cairo|Weapons")
    EWeaponSlot ActiveSlot = ${weapon.slotEnum};

protected:
    UPROPERTY() TMap<EWeaponSlot, TObjectPtr<AActor>> SlottedWeapons;
    UPROPERTY() TMap<EAttachmentSlot, TObjectPtr<UStaticMeshComponent>> ActiveAttachmentMeshes;
};`,
    [weapon.slotEnum],
  );

  const cppCode = useMemo(
    () => `#include "Inventory/CairoInventoryComponent.h"
#include "GameFramework/Character.h"

void UCairoInventoryComponent::SwitchWeaponSlot(EWeaponSlot TargetSlot)
{
    if (TargetSlot == ActiveSlot || !SlottedWeapons.Contains(TargetSlot)) return;

    ACharacter* OwnerChar = Cast<ACharacter>(GetOwner());
    if (!OwnerChar) return;

    // 1. Holster current weapon onto its PUBG-style back/thigh socket
    if (AActor* CurrentWeapon = SlottedWeapons.FindRef(ActiveSlot))
    {
        const FName HolsterSocket = (ActiveSlot == EWeaponSlot::Primary)
            ? TEXT("Spine_Primary_Socket")
            : (ActiveSlot == EWeaponSlot::Secondary ? TEXT("Thigh_Holster_R") : TEXT("Belt_Sheath_L"));
        CurrentWeapon->AttachToComponent(
            OwnerChar->GetMesh(), FAttachmentTransformRules::SnapToTargetNotIncludingScale, HolsterSocket);
    }

    // 2. Equip requested slot (${weapon.weaponName}) into right hand
    ActiveSlot = TargetSlot;
    if (AActor* NextWeapon = SlottedWeapons.FindRef(ActiveSlot))
    {
        NextWeapon->AttachToComponent(
            OwnerChar->GetMesh(), FAttachmentTransformRules::SnapToTargetNotIncludingScale, TEXT("WeaponSocket_R"));
    }
}

bool UCairoInventoryComponent::EquipAttachment(EWeaponSlot Slot, UWeaponAttachmentData* Attachment)
{
    AActor* WeaponActor = SlottedWeapons.FindRef(Slot);
    if (!WeaponActor || !Attachment || !Attachment->AttachmentMesh) return false;

    USkeletalMeshComponent* WeaponMesh = WeaponActor->FindComponentByClass<USkeletalMeshComponent>();
    if (!WeaponMesh) return false;

    // Reuse pooled StaticMeshComponent per attachment slot (mobile 60 FPS safe)
    UStaticMeshComponent* SlotComp = ActiveAttachmentMeshes.FindRef(Attachment->SlotType);
    if (!SlotComp)
    {
        SlotComp = NewObject<UStaticMeshComponent>(WeaponActor);
        SlotComp->RegisterComponent();
        ActiveAttachmentMeshes.Add(Attachment->SlotType, SlotComp);
    }

    SlotComp->SetStaticMesh(Attachment->AttachmentMesh);
    SlotComp->AttachToComponent(
        WeaponMesh, FAttachmentTransformRules::SnapToTargetNotIncludingScale, Attachment->AttachSocketName);
    return true;
}`,
    [weapon.weaponName],
  );

  const handleCopy = () => {
    const content =
      codeTab === 'blueprint'
        ? blueprintSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
        : codeTab === 'header'
          ? headerCode
          : cppCode;
    void navigator.clipboard?.writeText(content);
    const key = `${activeSlot}_${codeTab}`;
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((curr) => (curr === key ? null : curr)), 1800);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 1. Interactive 3-Slot Weapon Switcher (Primary / Secondary / Melee) */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[11px] text-[#9CA3AF]">
          <span>Weapon Switch Slots</span>
          <span className="font-mono text-[#E89B3C]">{weapon.slotEnum}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {WEAPON_SLOTS.map((slot, idx) => {
            const isSelected = slot.id === activeSlot;
            const SlotIcon = slot.id === 'primary' ? Crosshair : slot.id === 'secondary' ? Shield : Sword;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setActiveSlot(slot.id)}
                className={`flex flex-col items-start rounded-lg border px-2.5 py-2 text-left transition-colors ${
                  isSelected
                    ? 'border-[#E89B3C]/70 bg-[#1B2028] text-white'
                    : 'border-white/8 bg-[#161A20]/60 text-[#D1D5DB] hover:border-white/20'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <SlotIcon className={`h-3.5 w-3.5 ${isSelected ? 'text-[#E89B3C]' : 'text-[#9CA3AF]'}`} />
                  <span className="font-mono text-[10px] tabular-nums text-[#9CA3AF]">0{idx + 1}</span>
                </div>
                <div className="mt-1.5 text-xs font-semibold">{slot.label}</div>
                <div className="w-full truncate text-[10px] text-[#9CA3AF]">{slot.weaponName.split(' ')[0]}</div>
              </button>
            );
          })}
        </div>

        {/* Live Weapon Stats Bar (recalculated from PUBG attachments) */}
        <div className="mt-2.5 grid grid-cols-4 gap-2 rounded-lg border border-white/8 bg-[#0D0F12] px-2.5 py-2 font-mono text-[10px] tabular-nums">
          <div>
            <div className="text-[#9CA3AF]">Equip</div>
            <div className="text-white">{weapon.equipTimeSec}s</div>
          </div>
          <div>
            <div className="text-[#9CA3AF]">Recoil</div>
            <div className="text-[#E89B3C]">x{computedStats.recoilMultiplier}</div>
          </div>
          <div>
            <div className="text-[#9CA3AF]">ADS FOV</div>
            <div className="text-white">{computedStats.adsFov}°</div>
          </div>
          <div>
            <div className="text-[#9CA3AF]">Mag</div>
            <div className="text-white">{computedStats.magCapacity > 0 ? computedStats.magCapacity : 'Melee'}</div>
          </div>
        </div>
      </div>

      {/* 2. PUBG-Style Attachment Slot Matrix */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="mb-2 flex items-center justify-between text-[11px] text-[#9CA3AF]">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#E89B3C]" />
            <span>PUBG Attachment Slots</span>
          </span>
          <span className="font-mono text-[10px]">Tap slot to cycle</span>
        </div>

        {weapon.supportedSlots.length === 0 ? (
          <div className="rounded-lg border border-white/8 bg-[#161A20]/60 p-2.5 text-[11px] leading-relaxed text-[#9CA3AF]">
            Melee slot uses direct skeletal hand attachment (<span className="font-mono text-[#FDE68A]">Belt_Sheath_L</span>{' '}
            to <span className="font-mono text-[#FDE68A]">WeaponSocket_R</span>) with zero modular attachment overhead.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {(['optic', 'muzzle', 'grip', 'magazine'] as AttachmentSlotKey[]).map((slotKey) => {
              const supported = weapon.supportedSlots.includes(slotKey);
              const selectedOpt = ATTACHMENT_CATALOG[slotKey].find((a) => a.id === currentMods[slotKey]);
              const isEquipped = supported && selectedOpt && selectedOpt.id !== 'none';
              return (
                <button
                  key={slotKey}
                  type="button"
                  disabled={!supported}
                  onClick={() => cycleAttachment(slotKey)}
                  className={`flex flex-col rounded-lg border px-2.5 py-2 text-left transition-colors ${
                    !supported
                      ? 'cursor-not-allowed border-white/5 bg-[#0D0F12]/50 opacity-45'
                      : isEquipped
                        ? 'border-[#E89B3C]/60 bg-[#1B2028] text-white hover:border-[#E89B3C]'
                        : 'border-white/10 bg-[#161A20]/60 text-[#D1D5DB] hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-[#9CA3AF]">{SLOT_LABELS[slotKey]}</span>
                    <span className="font-mono text-[#E89B3C]">{supported ? selectedOpt?.socket.replace('Socket_', '') : 'N/A'}</span>
                  </div>
                  <div className="mt-1 truncate text-xs font-medium">
                    {supported ? selectedOpt?.label : 'Unsupported'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. UE5 Blueprint Graph Logic & C++ Preview */}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-display text-sm font-bold text-white">
              UCairoInventoryComponent
            </h3>
            <div className="truncate font-mono text-[10px] text-[#E89B3C]">
              Holster: {weapon.holsterSocket} · ADS Speed {computedStats.adsSpeedPct}%
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/12 bg-[#161A20] px-2.5 py-1.5 text-[11px] font-medium text-[#E89B3C] transition-colors hover:border-[#E89B3C] hover:text-white"
          >
            {copiedKey === `${activeSlot}_${codeTab}` ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>{copiedKey === `${activeSlot}_${codeTab}` ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-1 rounded-md bg-[#0D0F12] p-1">
          {(
            [
              { id: 'blueprint', label: 'BP Logic' },
              { id: 'header', label: 'Structs (.h)' },
              { id: 'cpp', label: 'Switch (.cpp)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCodeTab(tab.id)}
              className={`flex-1 rounded px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
                codeTab === tab.id ? 'bg-[#1D222B] text-white' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-2.5 min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-[#0B0D10] p-3">
          {codeTab === 'blueprint' ? (
            <ol className="space-y-2.5 text-xs leading-relaxed text-[#D1D5DB]">
              {blueprintSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-2.5">
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-[#E89B3C]">0{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <pre className="font-mono text-[11px] leading-relaxed text-[#E5E7EB] whitespace-pre">
              {codeTab === 'header' ? headerCode : cppCode}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
