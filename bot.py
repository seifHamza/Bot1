import discord
from discord.ext import commands
import os
import webbrowser
import ctypes
import pyautogui
import time

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

MY_USER_ID = 1452991268635410585 # ضع الـ ID الخاص بك

# مودال واحد يحتوي على كل شيء (اسم الشخص + الرسالة)
class WhatsAppModal(discord.ui.Modal):
    def __init__(self):
        super().__init__(title="إرسال واتساب")
        self.name_field = discord.ui.TextInput(label="اسم الشخص:", style=discord.TextStyle.short)
        self.msg_field = discord.ui.TextInput(label="الرسالة:", style=discord.TextStyle.paragraph)
        self.add_item(self.name_field)
        self.add_item(self.msg_field)

    async def on_submit(self, interaction: discord.Interaction):
        name = self.name_field.value
        message = self.msg_field.value
        await interaction.response.send_message(f"جاري إرسال الرسالة إلى {name}...", ephemeral=True)
        
        # التنفيذ
        os.system("start whatsapp://")
        time.sleep(5)
        pyautogui.hotkey('ctrl', 'f')
        time.sleep(1)
        pyautogui.write(name)
        time.sleep(1)
        pyautogui.press('enter')
        time.sleep(2)
        pyautogui.write(message)
        pyautogui.press('enter')

class InputModal(discord.ui.Modal):
    def __init__(self, action_type):
        super().__init__(title="التحكم عن بُعد")
        self.action_type = action_type
        self.input_field = discord.ui.TextInput(label="اكتب هنا", style=discord.TextStyle.short)
        self.add_item(self.input_field)

    async def on_submit(self, interaction: discord.Interaction):
        text = self.input_field.value
        if self.action_type == "search":
            webbrowser.open(f"https://www.google.com/search?q={text}")
            await interaction.response.send_message(f"جاري البحث عن: {text}", ephemeral=True)
        elif self.action_type == "message":
            ctypes.windll.user32.MessageBoxW(0, text, "رسالة من الموبايل", 0)
            await interaction.response.send_message("تم إظهار الرسالة!", ephemeral=True)

class MenuView(discord.ui.View):
    @discord.ui.button(label="Search", style=discord.ButtonStyle.primary)
    async def search_btn(self, interaction, button):
        await interaction.response.send_modal(InputModal("search"))

    @discord.ui.button(label="Message", style=discord.ButtonStyle.secondary)
    async def msg_btn(self, interaction, button):
        await interaction.response.send_modal(InputModal("message"))

    @discord.ui.button(label="WhatsApp", style=discord.ButtonStyle.success)
    async def wa_btn(self, interaction, button):
        await interaction.response.send_modal(WhatsAppModal())

@bot.command()
async def romm(ctx):
    if ctx.author.id == MY_USER_ID:
        await ctx.send("اختر الأمر:", view=MenuView())

bot.run('MTUyNTE4NzA1MjIzNTI2NDAzMQ.GfaSWZ.vb1I4qzP2Qnpum14ZmjxZYs6alHI8NSYY2iNbU')