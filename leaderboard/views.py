from django.shortcuts import render_to_response
from django.core.context_processors import csrf
from leaderboard.models import Game, User
import json

def leaders(request):
    leaders = User.objects.all()
    users = []
    board = {}

    for leader in leaders:
        users.append(leader.name)

    board['users'] = users
    board_json = json.dumps(board)

    return render_to_response("base.json", {'data':board_json})

def add_game(request):
    if request.method == 'POST':
        data_dict = {}
        if request.POST['time'] and request.POST['losers'] and request.POST['winner']:
            data_dict['time'] = request.POST['time']

            losers =  request.POST.getlist('losers')
            loser_objs = []
            data_dict['losers'] = losers

            for loser in losers:
                u = User.objects.get_or_create(name=loser, rank=-1)
                loser_objs.append(u)

            winner = request.POST['winner']
            winner_obj = User.objects.get_or_create(name=winner, rank=-1)
            data_dict['winner'] = winner
        
        return render_to_response("base.json", {'data':str(data_dict)})
    else:
        c = {}
        users = []
        for user in User.objects.all():
            users.append(user)

        c['users'] = users
        c.update(csrf(request))
        return render_to_response("form.html", c)

            
